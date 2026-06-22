from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict
import embedder, vectorstore, retriever, llm
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s — %(message)s",
)
logger = logging.getLogger("ai_service")

app = FastAPI(
    title="ORBIT AI - Standalone AI service",
    version="1.0.0",
)

class UpsertRequest(BaseModel):
    doc_id: str
    chunks: List[str]
    user_id: str
    file_name: str

class QueryRequest(BaseModel):
    query: str
    user_id: str
    top_k: int = 5
    chat_history: Optional[List[Dict]] = None

@app.post("/upsert", status_code=status.HTTP_200_OK)
def upsert_chunks(data: UpsertRequest):
    try:
        logger.info(f"Received upsert request for doc_id={data.doc_id}, chunks count={len(data.chunks)}")
        embeddings = embedder.embed_chunks(data.chunks)
        vectorstore.upsert_document(
            doc_id=data.doc_id,
            chunks=data.chunks,
            embeddings=embeddings,
            user_id=data.user_id,
            file_name=data.file_name
        )
        return {"status": "success", "message": f"Successfully upserted {len(data.chunks)} chunks."}
    except Exception as e:
        logger.error(f"Error in /upsert endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", status_code=status.HTTP_200_OK)
def query_knowledge_base(data: QueryRequest):
    try:
        logger.info(f"Received query request for user_id={data.user_id}, query='{data.query}'")
        context_chunks = retriever.retrieve_context(
            query=data.query,
            user_id=data.user_id,
            top_k=data.top_k
        )
        answer, sources = llm.generate_answer(
            query=data.query,
            context_chunks=context_chunks,
            chat_history=data.chat_history
        )
        return {
            "answer": answer,
            "sources": sources
        }
    except Exception as e:
        logger.error(f"Error in /query endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/document/{doc_id}", status_code=status.HTTP_200_OK)
def delete_document_embeddings(doc_id: str):
    try:
        logger.info(f"Received delete request for doc_id={doc_id}")
        vectorstore.delete_document(doc_id)
        return {"status": "success", "message": f"Successfully deleted embeddings for doc_id={doc_id}"}
    except Exception as e:
        logger.error(f"Error in DELETE /document endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "ok"}

import threading
import urllib.request

def start_keep_alive_thread():
    import time
    import os
    
    def keep_alive_loop():
        # Wait a few seconds for Uvicorn server startup to complete
        time.sleep(10)
        num = 1
        backend_url = os.getenv("BACKEND_URL")
        
        while True:
            # 1. Log count (cycling 1 to 5)
            logger.info(f"[Keep-Alive] Log count: {num}")
            num = num + 1 if num < 5 else 1
            
            # 2. Ping Backend Server
            if backend_url:
                try:
                    url = backend_url.rstrip('/') + '/health'
                    req = urllib.request.Request(url, headers={'User-Agent': 'OrbitAI-KeepAlive'})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        status_code = response.getcode()
                        logger.info(f"[Keep-Alive] Pinged backend, status: {status_code}")
                except Exception as e:
                    logger.error(f"[Keep-Alive] Failed to ping backend: {e}")
                    
            # 3. Ping Self
            self_url = os.getenv("SELF_URL")
            if self_url:
                try:
                    url = self_url.rstrip('/') + '/health'
                    req = urllib.request.Request(url, headers={'User-Agent': 'OrbitAI-KeepAlive'})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        status_code = response.getcode()
                        logger.info(f"[Keep-Alive] Pinged self, status: {status_code}")
                except Exception as e:
                    logger.error(f"[Keep-Alive] Failed to self-ping: {e}")
                    
            time.sleep(600)  # Every 10 minutes

    # Start loop as a background daemon thread so it doesn't block startup
    threading.Thread(target=keep_alive_loop, daemon=True).start()

start_keep_alive_thread()
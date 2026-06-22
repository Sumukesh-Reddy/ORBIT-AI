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

def keep_alive():
    import time
    counter = 1
    while True:
        logger.info(f"Keep-alive ping {counter}")
        counter += 1
        time.sleep(300)  # Sleep for 5 minutes

keep_alive()
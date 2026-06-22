import logging
import os
import chromadb
from config import settings

logger = logging.getLogger(__name__)

_chroma_client = None

def get_chroma_client():
    """
    Returns a singleton instance of the persistent ChromaDB client.
    """
    global _chroma_client
    if _chroma_client is None:
        persist_dir = settings.CHROMA_PERSIST_DIR
        # Ensure directory exists
        os.makedirs(persist_dir, exist_ok=True)
        logger.info(f"Initializing ChromaDB client at: {persist_dir}")
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
    return _chroma_client

def get_chunks_collection():
    """
    Get or create the standard collection for storing document chunks.
    """
    client = get_chroma_client()
    return client.get_or_create_collection(name="document_chunks")

def upsert_document(doc_id: str, chunks: list[str], embeddings: list[list[float]], user_id: str, file_name: str):
    """
    Stores document chunks and their embeddings in ChromaDB, along with ownership metadata.
    """
    if not chunks or not embeddings:
        logger.warning(f"No chunks or embeddings provided for document {doc_id}.")
        return

    if len(chunks) != len(embeddings):
        raise ValueError("Number of chunks must match number of embeddings.")

    collection = get_chunks_collection()
    
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "doc_id": str(doc_id),
            "user_id": str(user_id),
            "file_name": file_name,
            "chunk_index": i
        }
        for i in range(len(chunks))
    ]
    
    logger.info(f"Upserting {len(chunks)} chunks to ChromaDB for doc_id={doc_id}, user_id={user_id}")
    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=chunks
    )

def query_collection(query_embedding: list[float], user_id: str, top_k: int = 5) -> list[dict]:
    """
    Queries ChromaDB for the closest chunks, filtering by the user_id to enforce security.
    Returns a list of dictionaries containing document chunk content and metadata.
    """
    collection = get_chunks_collection()
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"user_id": str(user_id)}
    )
    
    formatted_results = []
    
    # Results lists are nested under query index [0]
    if not results or not results["documents"] or not results["documents"][0]:
        return []

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(documents)
    
    for i in range(len(documents)):
        formatted_results.append({
            "content": documents[i],
            "metadata": metadatas[i],
            "distance": distances[i]
        })
        
    return formatted_results

def delete_document(doc_id: str):
    """
    Deletes all chunks associated with a given doc_id from ChromaDB.
    """
    collection = get_chunks_collection()
    logger.info(f"Deleting ChromaDB chunks for doc_id={doc_id}")
    collection.delete(where={"doc_id": str(doc_id)})

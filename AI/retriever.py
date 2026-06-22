import logging
import embedder
import vectorstore

logger = logging.getLogger(__name__)

def retrieve_context(query: str, user_id: str, top_k: int = 5) -> list[dict]:
    """
    Orchestrate query retrieval:
    1. Embed user query text
    2. Query ChromaDB with user_id filter
    3. Return retrieved document chunks with metadata
    """
    try:
        logger.info(f"Retrieving context for query: '{query}' (user_id={user_id})")
        # 1. Embed query
        query_embedding = embedder.embed_query(query)
        
        # 2. Query Vectorstore
        results = vectorstore.query_collection(query_embedding, user_id, top_k)
        logger.info(f"Retrieved {len(results)} chunks from vector store.")
        return results
    except Exception as e:
        logger.error(f"Failed to retrieve context for query: {e}")
        return []

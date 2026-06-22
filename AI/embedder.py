import logging
import google.generativeai as genai
from config import settings

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    logger.info("Configuring google-generativeai SDK key...")
    genai.configure(api_key=settings.GEMINI_API_KEY)

def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """
    Generate Google Gemini embeddings for a list of text chunks.
    Uses 'models/gemini-embedding-2' and handles batching.
    """
    if not chunks:
        return []
    
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in environment settings.")
        
    embeddings = []
    batch_size = 100
    
    try:
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            response = genai.embed_content(
                model="models/gemini-embedding-2",
                content=batch,
                task_type="retrieval_document"
            )
            batch_embeddings = response.get('embedding', [])
            embeddings.extend(batch_embeddings)
        return embeddings
    except Exception as e:
        logger.error(f"Error generating chunk embeddings: {e}")
        raise

def embed_query(query: str) -> list[float]:
    """
    Generate Google Gemini embedding for a single text query string.
    """
    if not query:
        raise ValueError("Query string cannot be empty.")
        
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in environment settings.")
        
    try:
        response = genai.embed_content(
            model="models/gemini-embedding-2",
            content=query,
            task_type="retrieval_query"
        )
        return response.get('embedding', [])
    except Exception as e:
        logger.error(f"Error generating query embedding: {e}")
        raise

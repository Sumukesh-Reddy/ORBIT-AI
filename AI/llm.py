import logging
import google.generativeai as genai
from config import settings

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def generate_answer(query: str, context_chunks: list[dict], chat_history: list[dict] = None) -> tuple[str, list[str]]:
    """
    Generate a grounded response using Gemini 1.5 Flash based on the retrieved context.
    Optionally supports integrating chat history.
    """
    try:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured in environment settings.")
            
        # 1. Format context chunks and track source files
        context_blocks = []
        sources = []
        seen_sources = set()
        
        for chunk in context_chunks:
            metadata = chunk.get("metadata", {})
            file_name = metadata.get("file_name", "Unknown File")
            chunk_idx = metadata.get("chunk_index", 0)
            
            citation = f"{file_name} · chunk {chunk_idx + 1}"
            if citation not in seen_sources:
                seen_sources.add(citation)
                sources.append(citation)
            
            context_blocks.append(f"Source: [{citation}]\nContent: {chunk['content']}")
            
        context_text = "\n\n".join(context_blocks)
        
        # 2. Build Chat Messages
        system_prompt = (
            "You are ORBIT AI, a highly capability-rich and professional knowledge assistant. "
            "You help users synthesize knowledge from their uploaded documents.\n\n"
            "INSTRUCTIONS:\n"
            "1. Answer the user query using the provided Context block.\n"
            "2. Ground all claims directly in the Context. If the context does not contain the answer, "
            "politely say that you cannot find this information in the uploaded documents.\n"
            "3. Cite the source files (e.g. [filename.pdf · chunk X]) inline where you use their details.\n"
            "4. Format your response beautifully using clean Markdown (bold text, lists, and code blocks)."
        )
        
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_prompt
        )
        
        # Build contents structure for the SDK
        contents = []
        if chat_history:
            for msg in chat_history[-6:]:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [msg["content"]]})
                
        # Add current user prompt along with the retrieved context
        user_content = (
            f"Context:\n{context_text}\n\n"
            f"User Query: {query}"
        )
        contents.append({"role": "user", "parts": [user_content]})
        
        logger.info("Calling gemini-1.5-flash for answer generation...")
        response = model.generate_content(
            contents=contents,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 800
            }
        )
        
        answer = response.text.strip()
        logger.info("Generated answer successfully.")
        return answer, sources
        
    except Exception as e:
        logger.error(f"Failed to generate answer from Gemini: {e}")
        fallback_msg = (
            "I encountered an error trying to process this request with the Gemini AI assistant. "
            "Please verify that a valid `GEMINI_API_KEY` is configured in the environment."
        )
        return fallback_msg, []

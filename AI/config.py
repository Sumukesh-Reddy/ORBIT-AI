import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    CHROMA_PERSIST_DIR: str = "chroma_db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    # Support loading from standard env names as fallback
    if not settings.GEMINI_API_KEY:
        settings.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    return settings

settings = get_settings()

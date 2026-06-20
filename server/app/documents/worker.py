"""
Celery Worker — Document Processing Pipeline
============================================

Workflow:
  UPLOADED → PROCESSING → EMBEDDING → COMPLETED (or FAILED)

Tasks:
  process_document_task   Main pipeline orchestrator
  extract_text_task       Text extraction (PDF / DOCX / TXT)
  generate_embeddings_task  Chunking + embedding stub

Run worker with:
  celery -A app.documents.worker worker --loglevel=info --concurrency=4
"""

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
import io
import requests
from celery import Celery
from celery.utils.log import get_task_logger
from tenacity import retry, stop_after_attempt, wait_exponential
from pymongo import MongoClient
from bson import ObjectId

from app.config import settings
from app.documents.schemas import DocumentStatus

# ─── Celery App ──────────────────────────────────────────────────────────────
celery_app = Celery(
    "orbit_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Retry settings
    task_max_retries=3,
    task_default_retry_delay=60,
)

logger = get_task_logger(__name__)


# ─── Synchronous MongoDB helper (Celery workers are sync) ────────────────────
def _get_sync_db():
    client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
    return client[settings.DATABASE_NAME]


def _update_status(doc_id: str, status: DocumentStatus, error: str = None):
    """Update document status in MongoDB (sync)."""
    db = _get_sync_db()
    update = {
        "$set": {
            "status": status.value,
            "updatedAt": datetime.now(timezone.utc),
        }
    }
    if error:
        update["$set"]["errorMessage"] = error
    db.documents.update_one({"_id": ObjectId(doc_id)}, update)
    logger.info(f"Document {doc_id} → {status.value}")


# ─── Text Extraction ─────────────────────────────────────────────────────────
def _get_file_handle(file_path: str):
    """
    Returns a file-like object (bytes) for a given path.
    If it is a URL (starts with http:// or https://), downloads the file and returns BytesIO.
    If it is a local path, returns open(file_path, 'rb').
    """
    if file_path.startswith("http://") or file_path.startswith("https://"):
        logger.info(f"Downloading file from URL: {file_path}")
        response = requests.get(file_path, timeout=60)
        response.raise_for_status()
        return io.BytesIO(response.content)
    else:
        return open(file_path, "rb")


def _extract_text_from_pdf(file_path: str) -> str:
    try:
        import PyPDF2
        with _get_file_handle(file_path) as f:
            reader = PyPDF2.PdfReader(f)
            text = "\n".join(
                page.extract_text() or "" for page in reader.pages
            )
        return text.strip()
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")


def _extract_text_from_docx(file_path: str) -> str:
    try:
        from docx import Document
        with _get_file_handle(file_path) as f:
            doc = Document(f)
            return "\n".join(para.text for para in doc.paragraphs).strip()
    except Exception as e:
        raise RuntimeError(f"DOCX extraction failed: {e}")


def _extract_text_from_txt(file_path: str) -> str:
    with _get_file_handle(file_path) as f:
        content = f.read()
        if isinstance(content, bytes):
            return content.decode("utf-8", errors="replace").strip()
        return content.strip()


EXTRACTORS = {
    ".pdf": _extract_text_from_pdf,
    ".docx": _extract_text_from_docx,
    ".txt": _extract_text_from_txt,
}


def _extract_text(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    extractor = EXTRACTORS.get(ext)
    if not extractor:
        raise ValueError(f"No extractor for extension '{ext}'")
    return extractor(file_path)


# ─── Chunking ────────────────────────────────────────────────────────────────
def _chunk_text(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """Split text into overlapping chunks (by character count)."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i: i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


# ─── Celery Tasks ────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="documents.process",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def process_document_task(self, doc_id: str, file_path: str, source_type: str):
    """
    Main document processing pipeline.

    Steps:
      1. Extract text from file
      2. Chunk text into segments
      3. Generate embeddings (stub — plug in your vector DB here)
      4. Mark COMPLETED
    """
    logger.info(f"[START] Processing document {doc_id} ({source_type})")

    try:
        # ── Step 1: Set PROCESSING ───────────────────────────────────────────
        _update_status(doc_id, DocumentStatus.PROCESSING)
        time.sleep(0.5)  # Simulate brief delay

        # ── Step 2: Extract text ─────────────────────────────────────────────
        logger.info(f"Extracting text from {file_path}")
        text = _extract_text(file_path)

        if not text:
            raise ValueError("Extracted text is empty. The file may be corrupted or image-only.")

        # ── Step 3: Chunk text ───────────────────────────────────────────────
        _update_status(doc_id, DocumentStatus.EMBEDDING)
        chunks = _chunk_text(text)
        logger.info(f"Chunked into {len(chunks)} segments")

        # ── Step 4: Generate embeddings (stub) ───────────────────────────────
        # TODO: Replace with actual embedding model (e.g., OpenAI, HuggingFace)
        # Example:
        #   embeddings = embed_chunks(chunks)
        #   vector_db.upsert(doc_id, chunks, embeddings)
        time.sleep(1)  # Simulate embedding time

        # Store chunk count in MongoDB
        db = _get_sync_db()
        db.documents.update_one(
            {"_id": ObjectId(doc_id)},
            {"$set": {"chunkCount": len(chunks), "characterCount": len(text)}},
        )

        # ── Step 5: COMPLETED ────────────────────────────────────────────────
        _update_status(doc_id, DocumentStatus.COMPLETED)
        logger.info(f"[DONE] Document {doc_id} processed successfully. Chunks: {len(chunks)}")

        return {
            "doc_id": doc_id,
            "status": "COMPLETED",
            "chunks": len(chunks),
            "characters": len(text),
        }

    except Exception as exc:
        logger.error(f"[FAILED] Document {doc_id}: {exc}")

        # Retry with exponential backoff
        try:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
        except self.MaxRetriesExceededError:
            _update_status(doc_id, DocumentStatus.FAILED, error=str(exc))
            return {"doc_id": doc_id, "status": "FAILED", "error": str(exc)}


@celery_app.task(name="documents.health_check")
def health_check():
    """Simple task to verify the Celery worker is alive."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from bson import ObjectId
from app.database.mongodb import get_db
from app.documents.schemas import DocumentStatus
from app.config import settings
import cloudinary
import cloudinary.uploader

logger = logging.getLogger(__name__)

# Configure Cloudinary if credentials are provided
if settings.CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)
elif settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET
    )

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


def _serialize_document(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "userId": str(doc["userId"]),
        "title": doc["title"],
        "fileName": doc["fileName"],
        "filePath": doc["filePath"],
        "sourceType": doc["sourceType"],
        "fileSize": doc.get("fileSize", 0),
        "status": doc["status"],
        "taskId": doc.get("taskId"),
        "errorMessage": doc.get("errorMessage"),
        "createdAt": doc["createdAt"],
        "updatedAt": doc["updatedAt"],
    }


async def upload_document(file: UploadFile, user_id: str) -> dict:
    """
    Handle document upload:
    1. Validate file type and size
    2. Save to disk
    3. Create MongoDB record with status UPLOADED
    4. Dispatch Celery processing task
    """
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read content and validate size
    content = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB.",
        )

    # Check if Cloudinary is configured
    is_cloudinary_configured = bool(
        settings.CLOUDINARY_URL or 
        (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)
    )

    if is_cloudinary_configured:
        try:
            logger.info(f"Uploading file {file.filename} to Cloudinary...")
            await file.seek(0)
            upload_result = cloudinary.uploader.upload(
                file.file,
                resource_type="raw",
                public_id=f"orbit_docs/{user_id}/{uuid.uuid4()}{ext}"
            )
            file_path = upload_result.get("secure_url")
            logger.info(f"Cloudinary upload successful. URL: {file_path}")
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload document to global storage: {e}"
            )
    else:
        # Save to disk
        upload_dir = Path(settings.UPLOAD_DIR) / user_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{uuid.uuid4()}{ext}"
        file_path_obj = upload_dir / safe_name

        with open(file_path_obj, "wb") as f:
            f.write(content)
        file_path = str(file_path_obj)

    now = datetime.now(timezone.utc)
    title = Path(file.filename).stem

    # Determine source type
    source_type_map = {".pdf": "pdf", ".docx": "docx", ".txt": "txt"}
    source_type = source_type_map[ext]

    # Create DB record
    db = get_db()
    doc = {
        "userId": ObjectId(user_id),
        "title": title,
        "fileName": file.filename,
        "filePath": file_path,
        "sourceType": source_type,
        "fileSize": len(content),
        "status": DocumentStatus.UPLOADED,
        "taskId": None,
        "errorMessage": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.documents.insert_one(doc)
    doc_id = str(result.inserted_id)

    # Dispatch Celery task
    try:
        from app.documents.worker import process_document_task
        task = process_document_task.delay(doc_id, str(file_path), source_type)
        task_id = task.id

        # Store task ID
        await db.documents.update_one(
            {"_id": result.inserted_id},
            {"$set": {"taskId": task_id, "status": DocumentStatus.PROCESSING,
                      "updatedAt": datetime.now(timezone.utc)}},
        )
        doc["status"] = DocumentStatus.PROCESSING
        doc["taskId"] = task_id
    except Exception as e:
        logger.warning(f"Celery not available, document queued without task: {e}")

    doc["_id"] = result.inserted_id
    return {
        "document": _serialize_document(doc),
        "message": "Document uploaded and queued for processing.",
    }


async def list_documents(user_id: str, page: int = 1, limit: int = 20) -> dict:
    """Return paginated documents for a user."""
    db = get_db()
    skip = (page - 1) * limit
    query = {"userId": ObjectId(user_id)}

    total = await db.documents.count_documents(query)
    cursor = db.documents.find(query).sort("createdAt", -1).skip(skip).limit(limit)
    docs = [_serialize_document(d) async for d in cursor]

    return {
        "documents": docs,
        "total": total,
        "page": page,
        "limit": limit,
        "has_next": (skip + limit) < total,
    }


async def get_document(doc_id: str, user_id: str) -> dict:
    """Fetch a single document by ID (enforcing ownership)."""
    db = get_db()
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID.")

    doc = await db.documents.find_one({"_id": oid, "userId": ObjectId(user_id)})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )
    return _serialize_document(doc)


async def delete_document(doc_id: str, user_id: str) -> dict:
    """Delete a document record and its file from disk."""
    db = get_db()
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID.")

    doc = await db.documents.find_one({"_id": oid, "userId": ObjectId(user_id)})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    # Remove file from disk
    try:
        Path(doc["filePath"]).unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"Could not delete file {doc['filePath']}: {e}")

    await db.documents.delete_one({"_id": oid})
    return {"message": "Document deleted successfully."}


async def get_document_status(doc_id: str, user_id: str) -> dict:
    """Return just the processing status of a document."""
    doc = await get_document(doc_id, user_id)
    return {
        "id": doc["id"],
        "status": doc["status"],
        "taskId": doc.get("taskId"),
        "errorMessage": doc.get("errorMessage"),
        "updatedAt": doc["updatedAt"],
    }

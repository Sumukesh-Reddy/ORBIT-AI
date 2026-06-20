from fastapi import APIRouter, Depends, File, UploadFile, Query, status
from app.documents import service
from app.documents.schemas import DocumentListResponse, DocumentResponse, DocumentStatusResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document for processing",
)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a document (PDF, DOCX, or TXT).

    - Validates file type and size
    - Saves to disk
    - Creates DB record with status UPLOADED
    - Dispatches background Celery task for processing
    """
    return await service.upload_document(file, current_user["id"])


@router.get(
    "",
    response_model=DocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all documents for the current user",
)
async def list_documents(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Return paginated list of documents belonging to the authenticated user."""
    return await service.list_documents(current_user["id"], page, limit)


@router.get(
    "/{id}",
    response_model=DocumentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get document details",
)
async def get_document(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch full details of a specific document."""
    return await service.get_document(id, current_user["id"])


@router.delete(
    "/{id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a document",
)
async def delete_document(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a document record and its file from disk."""
    return await service.delete_document(id, current_user["id"])


@router.get(
    "/{id}/status",
    response_model=DocumentStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Poll document processing status",
)
async def get_document_status(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Poll the processing status of a document.
    Status progression: UPLOADED → PROCESSING → EMBEDDING → COMPLETED | FAILED
    """
    return await service.get_document_status(id, current_user["id"])

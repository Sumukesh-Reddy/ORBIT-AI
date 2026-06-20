from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class DocumentStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    EMBEDDING = "EMBEDDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class DocumentResponse(BaseModel):
    id: str
    userId: str
    title: str
    fileName: str
    filePath: str
    sourceType: str
    fileSize: int
    status: DocumentStatus
    taskId: Optional[str] = None
    errorMessage: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    limit: int
    has_next: bool


class DocumentStatusResponse(BaseModel):
    id: str
    status: DocumentStatus
    taskId: Optional[str] = None
    errorMessage: Optional[str] = None
    updatedAt: datetime

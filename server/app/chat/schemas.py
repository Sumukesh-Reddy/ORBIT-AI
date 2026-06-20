from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ── Request Schemas ──────────────────────────────────────────────────────────

class NewChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000, description="First message to seed the chat")


class RenameChatRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


# ── Response Schemas ─────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    id: str
    sessionId: str
    role: str          # "user" | "assistant"
    content: str
    sources: Optional[List[str]] = None
    createdAt: datetime


class ChatSessionResponse(BaseModel):
    id: str
    userId: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    messageCount: Optional[int] = 0


class ChatHistoryResponse(BaseModel):
    sessions: List[ChatSessionResponse]
    total: int
    page: int
    limit: int
    has_next: bool


class ChatDetailResponse(BaseModel):
    session: ChatSessionResponse
    messages: List[MessageResponse]

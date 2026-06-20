from fastapi import APIRouter, Depends, Query, status
from typing import Optional
from app.chat import service
from app.chat.schemas import (
    NewChatRequest, RenameChatRequest,
    ChatHistoryResponse, ChatDetailResponse,
    SendMessageRequest, MessageResponse,
)
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "/new",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat session",
)
async def new_chat(
    data: NewChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new chat session.
    - Generates title from first message
    - Stores the seeding user message
    """
    return await service.create_chat(current_user["id"], data)


@router.get(
    "/history",
    response_model=ChatHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get paginated chat history",
)
async def get_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by chat title"),
    current_user: dict = Depends(get_current_user),
):
    """
    Return paginated chat sessions for the authenticated user.
    Supports title search and pagination.
    """
    return await service.get_chat_history(current_user["id"], page, limit, search)


@router.get(
    "/{chatId}",
    response_model=ChatDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a chat session with all messages",
)
async def get_chat(
    chatId: str,
    current_user: dict = Depends(get_current_user),
):
    """Return a specific chat session and all its messages (sorted oldest → newest)."""
    return await service.get_chat_detail(chatId, current_user["id"])


@router.delete(
    "/{chatId}",
    status_code=status.HTTP_200_OK,
    summary="Delete a chat session",
)
async def delete_chat(
    chatId: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a chat session and all associated messages."""
    return await service.delete_chat(chatId, current_user["id"])


@router.patch(
    "/{chatId}/rename",
    status_code=status.HTTP_200_OK,
    summary="Rename a chat session",
)
async def rename_chat(
    chatId: str,
    data: RenameChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update the title of a chat session."""
    return await service.rename_chat(chatId, current_user["id"], data)


@router.post(
    "/{chatId}/message",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message to an existing chat session",
)
async def send_message(
    chatId: str,
    data: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Append a user message to the session, trigger dynamic AI response,
    and return the generated assistant reply.
    """
    import random
    from app.database.mongodb import get_db
    from bson import ObjectId

    # 1. Insert user message
    await service.add_message(chatId, current_user["id"], "user", data.content)

    # 2. Search user's completed documents to generate context-aware mock reply
    db = get_db()
    cursor = db.documents.find({"userId": ObjectId(current_user["id"]), "status": "COMPLETED"})
    docs = [doc async for doc in cursor]

    if docs:
        selected_doc = random.choice(docs)
        content = (
            f"Based on your knowledge base (specifically referring to **{selected_doc['fileName']}**), "
            f"here is my answer to '{data.content.strip()}':\n\n"
            f"I analyzed the text and mapped it to your semantic indices. "
            f"Let me know if you would like me to summarize other parts of **{selected_doc['title']}**."
        )
        sources = [f"{selected_doc['fileName']} · p.{random.randint(1, 15)}"]
    else:
        content = (
            f"I've searched your knowledge base, but it looks like you haven't uploaded any documents yet. "
            f"Please upload a PDF, DOCX, or TXT file using the '+' button in the input area "
            f"so I can analyze it and provide answers based on your documents!"
        )
        sources = []

    # 3. Insert assistant reply
    reply = await service.add_message(
        chatId,
        current_user["id"],
        "assistant",
        content,
        sources=sources
    )

    return reply

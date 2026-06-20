from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from bson import ObjectId
from app.database.mongodb import get_db
from app.chat.schemas import NewChatRequest, RenameChatRequest


def _generate_title(message: str, max_len: int = 60) -> str:
    """Generate a chat title from the first user message."""
    clean = message.strip().replace("\n", " ")
    return clean[:max_len] + ("..." if len(clean) > max_len else "")


def _serialize_session(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "userId": str(doc["userId"]),
        "title": doc["title"],
        "createdAt": doc["createdAt"],
        "updatedAt": doc["updatedAt"],
        "messageCount": doc.get("messageCount", 0),
    }


def _serialize_message(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "sessionId": str(doc["sessionId"]),
        "role": doc["role"],
        "content": doc["content"],
        "sources": doc.get("sources"),
        "createdAt": doc["createdAt"],
    }


async def create_chat(user_id: str, data: NewChatRequest) -> dict:
    """
    Create a new chat session seeded with the first user message and assistant reply.
    Returns the session + inserted user message.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    title = _generate_title(data.message)

    # Create session
    session_doc = {
        "userId": ObjectId(user_id),
        "title": title,
        "createdAt": now,
        "updatedAt": now,
        "messageCount": 2,
    }
    session_result = await db.chat_sessions.insert_one(session_doc)
    session_id = session_result.inserted_id

    # Insert first user message
    msg_doc = {
        "sessionId": session_id,
        "role": "user",
        "content": data.message.strip(),
        "createdAt": now,
    }
    await db.messages.insert_one(msg_doc)

    # Search user's documents
    cursor = db.documents.find({"userId": ObjectId(user_id), "status": "COMPLETED"})
    docs = [doc async for doc in cursor]

    if docs:
        content = (
            f"Hello! I've connected to your knowledge base. I can see you have uploaded the following files:\n"
            + "\n".join(f"• **{doc['fileName']}** ({doc['sourceType']})" for doc in docs)
            + f"\n\nHow can I help you analyze them today?"
        )
        sources = [f"{doc['fileName']} · p.1" for doc in docs[:3]]
    else:
        content = (
            "Welcome to ORBIT AI! I am your Personal Knowledge Operating System.\n\n"
            "It looks like you haven't uploaded any documents to this workspace yet. "
            "Please click the **+** button in the chat input below to upload PDFs, DOCX, or TXT files, "
            "and I will help you index and query them using hybrid retrieval!"
        )
        sources = []

    ai_now = datetime.now(timezone.utc)
    ai_doc = {
        "sessionId": session_id,
        "role": "assistant",
        "content": content,
        "sources": sources,
        "createdAt": ai_now,
    }
    await db.messages.insert_one(ai_doc)

    session_doc["_id"] = session_id
    return {
        "session": _serialize_session(session_doc),
        "message": "Chat session created.",
    }


async def get_chat_history(
    user_id: str,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
) -> dict:
    """Return paginated chat sessions for a user, with optional text search."""
    db = get_db()
    skip = (page - 1) * limit

    query: dict = {"userId": ObjectId(user_id)}
    if search:
        query["title"] = {"$regex": search, "$options": "i"}

    total = await db.chat_sessions.count_documents(query)
    cursor = (
        db.chat_sessions.find(query)
        .sort("updatedAt", -1)
        .skip(skip)
        .limit(limit)
    )
    sessions = [_serialize_session(doc) async for doc in cursor]

    return {
        "sessions": sessions,
        "total": total,
        "page": page,
        "limit": limit,
        "has_next": (skip + limit) < total,
    }


async def get_chat_detail(chat_id: str, user_id: str) -> dict:
    """Return a chat session with all its messages. Enforces ownership."""
    db = get_db()

    try:
        oid = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID.")

    session = await db.chat_sessions.find_one(
        {"_id": oid, "userId": ObjectId(user_id)}
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied.",
        )

    cursor = db.messages.find({"sessionId": oid}).sort("createdAt", 1)
    messages = [_serialize_message(doc) async for doc in cursor]

    return {
        "session": _serialize_session(session),
        "messages": messages,
    }


async def delete_chat(chat_id: str, user_id: str) -> dict:
    """Delete a chat session and all its messages."""
    db = get_db()

    try:
        oid = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID.")

    session = await db.chat_sessions.find_one(
        {"_id": oid, "userId": ObjectId(user_id)}
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied.",
        )

    await db.messages.delete_many({"sessionId": oid})
    await db.chat_sessions.delete_one({"_id": oid})

    return {"message": "Chat session deleted successfully."}


async def rename_chat(chat_id: str, user_id: str, data: RenameChatRequest) -> dict:
    """Rename a chat session title."""
    db = get_db()

    try:
        oid = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid chat ID.")

    result = await db.chat_sessions.find_one_and_update(
        {"_id": oid, "userId": ObjectId(user_id)},
        {"$set": {"title": data.title.strip(), "updatedAt": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied.",
        )

    return {
        "session": _serialize_session(result),
        "message": "Chat renamed successfully.",
    }


async def add_message(
    session_id: str,
    user_id: str,
    role: str,
    content: str,
    sources: Optional[list[str]] = None
) -> dict:
    """Append a message to an existing chat session."""
    db = get_db()

    try:
        s_oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID.")

    session = await db.chat_sessions.find_one(
        {"_id": s_oid, "userId": ObjectId(user_id)}
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    now = datetime.now(timezone.utc)
    msg_doc = {
        "sessionId": s_oid,
        "role": role,
        "content": content.strip(),
        "createdAt": now,
    }
    if sources is not None:
        msg_doc["sources"] = sources

    result = await db.messages.insert_one(msg_doc)

    # Update session timestamp + message count
    await db.chat_sessions.update_one(
        {"_id": s_oid},
        {"$set": {"updatedAt": now}, "$inc": {"messageCount": 1}},
    )

    msg_doc["_id"] = result.inserted_id
    return _serialize_message(msg_doc)

# ORBIT AI — Backend

Production-ready FastAPI backend with MongoDB Atlas, JWT Auth, Celery background workers, and Redis.

---

## Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI |
| Database | MongoDB Atlas (Motor async driver) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Background Jobs | Celery + Redis |
| Validation | Pydantic v2 |
| Config | pydantic-settings + `.env` |

---

## Folder Structure

```
backend/
├── app/
│   ├── auth/
│   │   ├── router.py        # POST /auth/register, /login, GET /auth/me, POST /auth/logout
│   │   ├── schemas.py       # Pydantic models
│   │   └── service.py       # Business logic (hashing, JWT generation)
│   ├── chat/
│   │   ├── router.py        # Chat CRUD endpoints
│   │   ├── schemas.py
│   │   └── service.py       # Session + message management
│   ├── documents/
│   │   ├── router.py        # Upload + status endpoints
│   │   ├── schemas.py       # DocumentStatus enum
│   │   ├── service.py       # Upload, list, delete logic
│   │   └── worker.py        # Celery tasks (extract → chunk → embed)
│   ├── database/
│   │   └── mongodb.py       # Motor client + index creation
│   ├── middleware/
│   │   └── auth.py          # get_current_user FastAPI dependency
│   ├── utils/
│   │   ├── hashing.py       # bcrypt hash/verify
│   │   └── jwt.py           # JWT create/decode
│   ├── config.py            # pydantic-settings
│   └── main.py              # FastAPI app + CORS + routers
├── celery_worker.py         # Celery CLI entry point
├── requirements.txt
├── .env.example
└── README.md
```

---

## Quick Start

### 1. Clone & setup environment

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set MONGODB_URL and JWT_SECRET_KEY
```

### 3. Start Redis

```bash
# macOS
brew install redis && brew services start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 4. Run the API server

```bash
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 5. Start the Celery worker (separate terminal)

```bash
celery -A celery_worker worker --loglevel=info --concurrency=4
```

---

## API Reference

### Authentication  `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Create account (hashes password) |
| `POST` | `/auth/login` | ❌ | Login, returns JWT |
| `GET` | `/auth/me` | ✅ Bearer | Get current user profile |
| `POST` | `/auth/logout` | ✅ Bearer | Logout (discard token client-side) |

**Register body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "Secure123!"
}
```

**Login response:**
```json
{
  "user": { "id": "...", "name": "Jane Smith", "email": "...", "createdAt": "..." },
  "token": { "access_token": "eyJ...", "token_type": "bearer", "expires_in": 3600 },
  "message": "Login successful."
}
```

---

### Chat  `/api/v1/chat`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/new` | Create session (auto-generates title) |
| `GET` | `/chat/history` | Paginated history, supports `?search=` |
| `GET` | `/chat/{chatId}` | Session + all messages |
| `DELETE` | `/chat/{chatId}` | Delete session + messages |
| `PATCH` | `/chat/{chatId}/rename` | Rename session title |

**Query params for `/chat/history`:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (optional, title substring search)

---

### Documents  `/api/v1/documents`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/upload` | Upload PDF/DOCX/TXT |
| `GET` | `/documents` | List user documents (paginated) |
| `GET` | `/documents/{id}` | Get document details |
| `DELETE` | `/documents/{id}` | Delete document + file |
| `GET` | `/documents/{id}/status` | Poll processing status |

**Processing Status Flow:**
```
UPLOADED → PROCESSING → EMBEDDING → COMPLETED
                                  ↘ FAILED (with errorMessage)
```

---

## MongoDB Collections

### `users`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique, lowercase)",
  "password": "bcrypt hash",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### `chat_sessions`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId → users",
  "title": "string",
  "messageCount": "int",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### `messages`
```json
{
  "_id": "ObjectId",
  "sessionId": "ObjectId → chat_sessions",
  "role": "user | assistant",
  "content": "string",
  "createdAt": "datetime"
}
```

### `documents`
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId → users",
  "title": "string",
  "fileName": "string",
  "filePath": "string",
  "sourceType": "pdf | docx | txt",
  "fileSize": "int (bytes)",
  "status": "UPLOADED | PROCESSING | EMBEDDING | COMPLETED | FAILED",
  "taskId": "string (Celery task ID)",
  "errorMessage": "string | null",
  "chunkCount": "int",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

---

## Security

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT signed with HS256, configurable expiry
- All chat and document routes protected by `Authorization: Bearer <token>`
- File uploads validated by extension and MIME type
- Max upload size enforced (default 50 MB)
- User-scoped data — all queries filter by `userId`

---

## Celery Task Retry Policy

| Attempt | Delay |
|---|---|
| 1st retry | 30 seconds |
| 2nd retry | 60 seconds |
| 3rd retry | 90 seconds |
| Max retries exceeded | Status → `FAILED` |

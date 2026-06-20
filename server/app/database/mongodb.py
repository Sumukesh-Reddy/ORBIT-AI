from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Connect to MongoDB Atlas."""
    global client, db
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
        )
        db = client[settings.DATABASE_NAME]

        # Verify connection
        await client.admin.command("ping")
        logger.info(f"✅ Connected to MongoDB Atlas — database: '{settings.DATABASE_NAME}'")

        # Create indexes
        await _create_indexes()

    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        raise


async def disconnect_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")


async def _create_indexes():
    """Create all required MongoDB indexes."""
    # Users — unique email
    await db.users.create_index("email", unique=True)
    await db.users.create_index("createdAt")

    # Chat sessions
    await db.chat_sessions.create_index("userId")
    await db.chat_sessions.create_index("updatedAt")
    await db.chat_sessions.create_index([("title", "text")])

    # Messages
    await db.messages.create_index("sessionId")
    await db.messages.create_index("createdAt")

    # Documents
    await db.documents.create_index("userId")
    await db.documents.create_index("status")
    await db.documents.create_index("createdAt")

    # Pending Registrations
    await db.pending_registrations.create_index("email", unique=True)
    await db.pending_registrations.create_index("expiresAt", expireAfterSeconds=0)

    logger.info("✅ MongoDB indexes ensured.")


def get_db():
    """Return the current database instance."""
    return db

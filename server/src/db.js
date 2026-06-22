import { MongoClient } from 'mongodb';
import { settings } from './config.js';

let client = null;
let db = null;

export async function connectDb() {
  try {
    client = new MongoClient(settings.MONGODB_URL);
    await client.connect();
    db = client.db(settings.DATABASE_NAME);
    
    // Verify connection
    await db.command({ ping: 1 });
    console.log(`✅ Connected to MongoDB — database: '${settings.DATABASE_NAME}'`);
    
    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDb() first.');
  }
  return db;
}

export async function disconnectDb() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

async function createIndexes() {
  try {
    // Users
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: 1 });

    // Chat sessions
    await db.collection('chat_sessions').createIndex({ userId: 1 });
    await db.collection('chat_sessions').createIndex({ updatedAt: 1 });
    await db.collection('chat_sessions').createIndex({ title: 'text' });

    // Messages
    await db.collection('messages').createIndex({ sessionId: 1 });
    await db.collection('messages').createIndex({ createdAt: 1 });

    // Documents
    await db.collection('documents').createIndex({ userId: 1 });
    await db.collection('documents').createIndex({ status: 1 });
    await db.collection('documents').createIndex({ createdAt: 1 });

    // Pending Registrations
    await db.collection('pending_registrations').createIndex({ email: 1 }, { unique: true });
    // TTL index
    await db.collection('pending_registrations').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    console.log('✅ MongoDB indexes ensured.');
  } catch (error) {
    console.error(`❌ Index creation failed: ${error.message}`);
  }
}

import { Router } from 'express';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';
import { settings } from '../config.js';
import axios from 'axios';

const router = Router();

function serializeSession(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    messageCount: doc.messageCount || 0
  };
}

function serializeMessage(doc) {
  return {
    id: doc._id.toString(),
    sessionId: doc.sessionId.toString(),
    role: doc.role,
    content: doc.content,
    sources: doc.sources || null,
    attachments: doc.attachments || null,
    createdAt: doc.createdAt
  };
}

function generateTitle(message, maxLen = 60) {
  const clean = message.trim().replace(/\n/g, ' ');
  return clean.slice(0, maxLen) + (clean.length > maxLen ? '...' : '');
}

// POST /new
router.post('/new', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ detail: 'First message content is required.' });
  }

  try {
    const db = getDb();
    const userId = req.user.id;
    const now = new Date();
    const title = generateTitle(message);

    // Create session
    const sessionDoc = {
      userId: new ObjectId(userId),
      title,
      createdAt: now,
      updatedAt: now,
      messageCount: 2
    };

    const sessionResult = await db.collection('chat_sessions').insertOne(sessionDoc);
    const sessionId = sessionResult.insertedId;

    // Insert first user message
    const msgDoc = {
      sessionId,
      role: 'user',
      content: message.trim(),
      attachments: req.body.attachments || null,
      createdAt: now
    };
    await db.collection('messages').insertOne(msgDoc);

    // Call AI microservice for greeting
    let content;
    let sources = [];
    try {
      const aiResponse = await axios.post(
        `${settings.AI_SERVICE_URL}/query`,
        {
          query: message.trim(),
          user_id: userId,
          chat_history: [],
          top_k: 5
        },
        { timeout: 60000 }
      );
      content = aiResponse.data.answer;
      sources = aiResponse.data.sources || [];
    } catch (e) {
      // Fallback
      const docs = await db.collection('documents').find({
        userId: new ObjectId(userId),
        status: 'COMPLETED'
      }).toArray();

      if (docs.length > 0) {
        content = `Hello! I've connected to your knowledge base. I can see you have uploaded the following files:\n` +
          docs.map(doc => `• **${doc.fileName}** (${doc.sourceType})`).join('\n') +
          `\n\nHow can I help you analyze them today?`;
        sources = docs.slice(0, 3).map(doc => `${doc.fileName} · chunk 1`);
      } else {
        content = "Welcome to ORBIT AI! I am your Personal Knowledge Operating System.\n\n" +
          "It looks like you haven't uploaded any documents to this workspace yet. " +
          "Please click the **+** button in the chat input below to upload PDFs, DOCX, or TXT files, " +
          "and I will help you index and query them!";
        sources = [];
      }
    }

    const aiDoc = {
      sessionId,
      role: 'assistant',
      content,
      sources,
      createdAt: new Date()
    };
    await db.collection('messages').insertOne(aiDoc);

    sessionDoc._id = sessionId;

    return res.status(201).json({
      session: serializeSession(sessionDoc),
      message: 'Chat session created.'
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ detail: 'Failed to start chat session.' });
  }
});

// GET /history
router.get('/history', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const search = req.query.search;

  try {
    const db = getDb();
    const userId = req.user.id;
    const skip = (page - 1) * limit;

    const query = { userId: new ObjectId(userId) };
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const total = await db.collection('chat_sessions').countDocuments(query);
    const cursor = db.collection('chat_sessions')
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const sessions = await cursor.toArray();

    return res.status(200).json({
      sessions: sessions.map(serializeSession),
      total,
      page,
      limit,
      has_next: (skip + limit) < total
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ detail: 'Failed to fetch chat history.' });
  }
});

// GET /:chatId
router.get('/:chatId', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  let oid;
  try {
    oid = new ObjectId(chatId);
  } catch (e) {
    return res.status(400).json({ detail: 'Invalid chat ID.' });
  }

  try {
    const db = getDb();
    const session = await db.collection('chat_sessions').findOne({
      _id: oid,
      userId: new ObjectId(userId)
    });

    if (!session) {
      return res.status(404).json({ detail: 'Chat session not found or access denied.' });
    }

    const messagesCursor = db.collection('messages')
      .find({ sessionId: oid })
      .sort({ createdAt: 1 });
    const messages = await messagesCursor.toArray();

    return res.status(200).json({
      session: serializeSession(session),
      messages: messages.map(serializeMessage)
    });
  } catch (error) {
    console.error('Error fetching chat session details:', error);
    return res.status(500).json({ detail: 'Failed to fetch chat session details.' });
  }
});

// DELETE /:chatId
router.delete('/:chatId', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  let oid;
  try {
    oid = new ObjectId(chatId);
  } catch (e) {
    return res.status(400).json({ detail: 'Invalid chat ID.' });
  }

  try {
    const db = getDb();
    const session = await db.collection('chat_sessions').findOne({
      _id: oid,
      userId: new ObjectId(userId)
    });

    if (!session) {
      return res.status(404).json({ detail: 'Chat session not found or access denied.' });
    }

    // Delete messages and session
    await db.collection('messages').deleteMany({ sessionId: oid });
    await db.collection('chat_sessions').deleteOne({ _id: oid });

    return res.status(200).json({ message: 'Chat session deleted successfully.' });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return res.status(500).json({ detail: 'Failed to delete chat session.' });
  }
});

// PATCH /:chatId/rename
router.patch('/:chatId/rename', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { title } = req.body;
  const userId = req.user.id;

  if (!title || !title.trim()) {
    return res.status(400).json({ detail: 'Title is required.' });
  }

  let oid;
  try {
    oid = new ObjectId(chatId);
  } catch (e) {
    return res.status(400).json({ detail: 'Invalid chat ID.' });
  }

  try {
    const db = getDb();
    const result = await db.collection('chat_sessions').findOneAndUpdate(
      { _id: oid, userId: new ObjectId(userId) },
      { $set: { title: title.trim(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ detail: 'Chat session not found or access denied.' });
    }

    return res.status(200).json({
      session: serializeSession(result),
      message: 'Chat renamed successfully.'
    });
  } catch (error) {
    console.error('Error renaming chat session:', error);
    return res.status(500).json({ detail: 'Failed to rename chat session.' });
  }
});

// POST /:chatId/message
router.post('/:chatId/message', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { content: messageContent } = req.body;
  const userId = req.user.id;

  if (!messageContent || !messageContent.trim()) {
    return res.status(400).json({ detail: 'Message content is required.' });
  }

  let oid;
  try {
    oid = new ObjectId(chatId);
  } catch (e) {
    return res.status(400).json({ detail: 'Invalid chat ID.' });
  }

  try {
    const db = getDb();
    const session = await db.collection('chat_sessions').findOne({
      _id: oid,
      userId: new ObjectId(userId)
    });

    if (!session) {
      return res.status(404).json({ detail: 'Session not found.' });
    }

    const now = new Date();

    // 1. Insert user message
    const userMsgDoc = {
      sessionId: oid,
      role: 'user',
      content: messageContent.trim(),
      attachments: req.body.attachments || null,
      createdAt: now
    };
    await db.collection('messages').insertOne(userMsgDoc);

    // 2. Fetch history
    const historyDocs = await db.collection('messages')
      .find({ sessionId: oid })
      .sort({ createdAt: 1 })
      .toArray();

    // The last message is the one we just inserted, exclude it from history
    const chat_history = historyDocs.slice(0, -1).map(doc => ({
      role: doc.role,
      content: doc.content
    }));

    // 3. Query AI microservice
    let content;
    let sources = [];
    try {
      const response = await axios.post(
        `${settings.AI_SERVICE_URL}/query`,
        {
          query: messageContent.trim(),
          user_id: userId,
          chat_history,
          top_k: 5
        },
        { timeout: 60000 }
      );
      content = response.data.answer;
      sources = response.data.sources || [];
    } catch (e) {
      content = "I'm sorry, I encountered an error communicating with the AI brain service. Please check if the AI service is running.";
      sources = [];
    }

    // 4. Insert assistant message
    const assistantMsgDoc = {
      sessionId: oid,
      role: 'assistant',
      content,
      sources,
      createdAt: new Date()
    };
    const assistantResult = await db.collection('messages').insertOne(assistantMsgDoc);
    assistantMsgDoc._id = assistantResult.insertedId;

    // 5. Update session count & time
    await db.collection('chat_sessions').updateOne(
      { _id: oid },
      { $set: { updatedAt: new Date() }, $inc: { messageCount: 2 } }
    );

    return res.status(200).json(serializeMessage(assistantMsgDoc));
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ detail: 'Failed to send message.' });
  }
});

export default router;

import { Router } from 'express';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { authenticateToken } from '../middleware/auth.js';
import { settings } from '../config.js';
import { documentQueue } from '../utils/queue.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';

const router = Router();
const upload = multer({ dest: 'temp_uploads/' });

// Configure Cloudinary if credentials are provided
const isCloudinaryConfigured = !!(
  settings.CLOUDINARY_URL ||
  (settings.CLOUDINARY_CLOUD_NAME && settings.CLOUDINARY_API_KEY && settings.CLOUDINARY_API_SECRET)
);

if (isCloudinaryConfigured) {
  if (settings.CLOUDINARY_URL) {
    cloudinary.config({ cloudinary_url: settings.CLOUDINARY_URL });
  } else {
    cloudinary.config({
      cloud_name: settings.CLOUDINARY_CLOUD_NAME,
      api_key: settings.CLOUDINARY_API_KEY,
      api_secret: settings.CLOUDINARY_API_SECRET
    });
  }
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

function serializeDocument(doc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    title: doc.title,
    fileName: doc.fileName,
    filePath: doc.filePath,
    sourceType: doc.sourceType,
    fileSize: doc.fileSize || 0,
    status: doc.status,
    taskId: doc.taskId || null,
    errorMessage: doc.errorMessage || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

// Ensure temp_uploads directory exists
await fs.mkdir('temp_uploads', { recursive: true }).catch(() => {});

// POST /upload
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'No file provided.' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ detail: `Unsupported file type '${ext}'. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` });
  }

  const maxBytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (req.file.size > maxBytes) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(413).json({ detail: `File exceeds maximum size of ${settings.MAX_FILE_SIZE_MB} MB.` });
  }

  const userId = req.user.id;
  let filePath;
  let localProcessingPath;
  let deleteAfterProcessing = false;
  
  try {
    if (isCloudinaryConfigured) {
      console.log(`Uploading file ${req.file.originalname} to Cloudinary...`);
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        public_id: `orbit_docs/${userId}/${uuidv4()}`
      });
      filePath = result.secure_url;
      localProcessingPath = req.file.path;
      deleteAfterProcessing = true;
    } else {
      const uploadDir = path.join(settings.UPLOAD_DIR, userId);
      await fs.mkdir(uploadDir, { recursive: true });
      const safeName = `${uuidv4()}${ext}`;
      const finalPath = path.join(uploadDir, safeName);
      await fs.rename(req.file.path, finalPath);
      filePath = finalPath;
      localProcessingPath = finalPath;
      deleteAfterProcessing = false;
    }
    
    const now = new Date();
    const title = path.parse(req.file.originalname).name;
    const sourceType = ext === '.pdf' ? 'pdf' : ext === '.docx' ? 'docx' : 'txt';
    
    const db = getDb();
    const docDoc = {
      userId: new ObjectId(userId),
      title,
      fileName: req.file.originalname,
      filePath,
      sourceType,
      fileSize: req.file.size,
      status: 'UPLOADED',
      taskId: uuidv4(), // generate dummy taskId to represent job ID
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    };
    
    const insertResult = await db.collection('documents').insertOne(docDoc);
    const docId = insertResult.insertedId.toString();
    
    // Dispatch background document processing via Redis BullMQ queue
    const job = await documentQueue.add('process-document', {
      docId,
      filePath: localProcessingPath,
      sourceType,
      options: { deleteAfterProcessing }
    });
    
    // Update document record with the actual BullMQ Job ID
    await db.collection('documents').updateOne(
      { _id: insertResult.insertedId },
      { $set: { taskId: job.id, status: 'PROCESSING' } }
    );
    
    docDoc.status = 'PROCESSING';
    docDoc.taskId = job.id;
    docDoc._id = insertResult.insertedId;
    
    return res.status(201).json({
      document: serializeDocument(docDoc),
      message: 'Document uploaded and queued for processing.'
    });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    console.error('Document upload error:', error);
    return res.status(500).json({ detail: 'Failed to upload document.' });
  }
});

// GET /
router.get('/', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  
  try {
    const db = getDb();
    const userId = req.user.id;
    const skip = (page - 1) * limit;
    
    const query = { userId: new ObjectId(userId) };
    const total = await db.collection('documents').countDocuments(query);
    const cursor = db.collection('documents')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const docs = await cursor.toArray();
    
    return res.status(200).json({
      documents: docs.map(serializeDocument),
      total,
      page,
      limit,
      has_next: (skip + limit) < total
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return res.status(500).json({ detail: 'Failed to retrieve documents.' });
  }
});

// GET /:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  let oid;
  try {
    oid = new ObjectId(id);
  } catch (e) {
    return res.status(400).json({ detail: 'Invalid document ID.' });
  }
  
  try {
    const db = getDb();
    const doc = await db.collection('documents').findOne({ _id: oid, userId: new ObjectId(userId) });
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found or access denied.' });
    }
    return res.status(200).json(serializeDocument(doc));
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ detail: 'Failed to fetch document.' });
  }
});

// DELETE /:id
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  let oid;
  try {
    oid = new ObjectId(id);
  } catch (e) {
    return res.status(400).json({ detail: 'Invalid document ID.' });
  }
  
  try {
    const db = getDb();
    const doc = await db.collection('documents').findOne({ _id: oid, userId: new ObjectId(userId) });
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found or access denied.' });
    }
    
    // Remove file from disk
    if (doc.filePath && !doc.filePath.startsWith('http')) {
      await fs.unlink(doc.filePath).catch(err => {
        console.warn(`Could not delete file ${doc.filePath}:`, err.message);
      });
    }
    
    // Delete document record
    await db.collection('documents').deleteOne({ _id: oid });
    
    // Clean up vector store chunks
    try {
      await axios.delete(`${settings.AI_SERVICE_URL}/document/${id}`);
    } catch (err) {
      console.warn(`Could not delete vector store chunks for doc ${id}:`, err.message);
    }
    
    return res.status(200).json({ message: 'Document deleted successfully.' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ detail: 'Failed to delete document.' });
  }
});

// GET /:id/status
router.get('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  let oid;
  try {
    oid = new ObjectId(id);
  } catch (e) {
    return res.status(400).json({ detail: 'Invalid document ID.' });
  }
  
  try {
    const db = getDb();
    const doc = await db.collection('documents').findOne({ _id: oid, userId: new ObjectId(userId) });
    if (!doc) {
      return res.status(404).json({ detail: 'Document not found or access denied.' });
    }
    
    return res.status(200).json({
      id: doc._id.toString(),
      status: doc.status,
      taskId: doc.taskId || null,
      errorMessage: doc.errorMessage || null,
      updatedAt: doc.updatedAt
    });
  } catch (error) {
    console.error('Error fetching document status:', error);
    return res.status(500).json({ detail: 'Failed to retrieve document status.' });
  }
});

export default router;

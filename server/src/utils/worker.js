import fs from 'fs/promises';
import axios from 'axios';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { settings } from '../config.js';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { Worker } from 'bullmq';
import Redis from 'ioredis';

// Helper to get file buffer (supports both url and local file path)
async function getFileBuffer(filePath) {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const response = await axios.get(filePath, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } else {
    return await fs.readFile(filePath);
  }
}

// Text extractors
async function extractTextFromPdf(buffer) {
  const data = await pdf(buffer);
  return data.text.trim();
}

async function extractTextFromDocx(buffer) {
  const data = await mammoth.extractRawText({ buffer });
  return data.value.trim();
}

function extractTextFromTxt(buffer) {
  return buffer.toString('utf8').trim();
}

const EXTRACTORS = {
  pdf: extractTextFromPdf,
  docx: extractTextFromDocx,
  txt: extractTextFromTxt
};

// Main processing worker task runner
export async function processDocumentTask(docId, filePath, sourceType, options = {}) {
  const db = getDb();
  console.log(`[START] Processing document ${docId} (${sourceType})`);

  try {
    // 1. Set status to PROCESSING
    await db.collection('documents').updateOne(
      { _id: new ObjectId(docId) },
      { $set: { status: 'PROCESSING', updatedAt: new Date() } }
    );

    // 2. Get file buffer & extract text
    console.log(`Extracting text from ${filePath}`);
    const buffer = await getFileBuffer(filePath);
    const extractor = EXTRACTORS[sourceType];
    if (!extractor) {
      throw new Error(`Unsupported source type: ${sourceType}`);
    }
    
    const text = await extractor(buffer);
    if (!text) {
      throw new Error('Extracted text is empty. The file may be corrupted or image-only.');
    }

    // 3. Set status to EMBEDDING & chunk text
    await db.collection('documents').updateOne(
      { _id: new ObjectId(docId) },
      { $set: { status: 'EMBEDDING', updatedAt: new Date() } }
    );
    const chunks = chunkText(text);
    console.log(`Chunked into ${chunks.length} segments`);

    // Fetch user_id and file_name from db doc
    const doc = await db.collection('documents').findOne({ _id: new ObjectId(docId) });
    if (!doc) {
      throw new Error(`Document ${docId} not found in database.`);
    }

    // 4. Send chunks to AI microservice
    console.log(`Sending ${chunks.length} chunks to AI microservice for doc_id=${docId}`);
    const response = await axios.post(
      `${settings.AI_SERVICE_URL}/upsert`,
      {
        doc_id: docId,
        chunks: chunks,
        user_id: doc.userId.toString(),
        file_name: doc.fileName
      },
      { timeout: 180000 } // 3 minutes timeout for embedding
    );

    if (response.status !== 200) {
      throw new Error(`AI service returned status code ${response.status}`);
    }

    // 5. Update chunk/char counts & set COMPLETED
    await db.collection('documents').updateOne(
      { _id: new ObjectId(docId) },
      {
        $set: {
          chunkCount: chunks.length,
          characterCount: text.length,
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      }
    );

    console.log(`[DONE] Document ${docId} processed successfully. Chunks: ${chunks.length}`);
  } catch (error) {
    console.error(`[FAILED] Document ${docId}:`, error.message);
    await db.collection('documents').updateOne(
      { _id: new ObjectId(docId) },
      {
        $set: {
          status: 'FAILED',
          errorMessage: error.message,
          updatedAt: new Date()
        }
      }
    );
  } finally {
    if (options.deleteAfterProcessing) {
      console.log(`Cleaning up local temp file: ${filePath}`);
      await fs.unlink(filePath).catch(err => {
        console.warn(`Failed to delete temp file ${filePath}:`, err.message);
      });
    }
  }
}

function chunkText(text, chunkSize = 512, overlap = 64) {
  const words = text.trim().split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    i += (chunkSize - overlap);
  }
  return chunks;
}

// Instantiate Redis connection for the Worker consumer
const redisConnection = new Redis(settings.REDIS_URL, {
  maxRetriesPerRequest: null
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Worker Connection Error:', err.message);
});

export const documentWorker = new Worker(
  'document-processing',
  async (job) => {
    const { docId, filePath, sourceType, options } = job.data;
    console.log(`[Queue] Processing job ${job.id} for document ${docId}`);
    await processDocumentTask(docId, filePath, sourceType, options);
  },
  {
    connection: redisConnection,
    concurrency: 1 // process documents sequentially
  }
);

documentWorker.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} completed successfully.`);
});

documentWorker.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} failed:`, err.message);
});

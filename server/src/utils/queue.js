import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { settings } from '../config.js';

// Instantiate Redis connection for the Queue producer
const connection = new Redis(settings.REDIS_URL, {
  maxRetriesPerRequest: null
});

connection.on('error', (err) => {
  console.error('❌ Redis Queue Connection Error:', err.message);
});

export const documentQueue = new Queue('document-processing', {
  connection
});

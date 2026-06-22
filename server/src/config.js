import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const settings = {
  APP_NAME: 'ORBIT AI',
  APP_VERSION: '1.0.0',
  PORT: process.env.PORT || 8000,
  DEBUG: process.env.DEBUG !== 'false',

  // MongoDB
  MONGODB_URL: process.env.MONGODB_URL,
  DATABASE_NAME: process.env.DATABASE_NAME || 'orbit_ai',

  // JWT
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
  ACCESS_TOKEN_EXPIRE_MINUTES: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '60', 10),
  REFRESH_TOKEN_EXPIRE_DAYS: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7', 10),

  // Google Auth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',

  // Resend API
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',

  // Cloudinary
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),

  // AI Microservice
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8001',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

// Check required variables
if (!settings.MONGODB_URL) {
  console.warn('⚠️ Warning: MONGODB_URL is not defined in environment variables.');
}
if (!settings.JWT_SECRET_KEY) {
  console.warn('⚠️ Warning: JWT_SECRET_KEY is not defined in environment variables.');
}

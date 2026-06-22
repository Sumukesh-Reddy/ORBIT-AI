import express from 'express';
import cors from 'cors';
import { connectDb, disconnectDb } from './db.js';
import { settings } from './config.js';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import documentsRouter from './routes/documents.js';
import './utils/worker.js';

const app = express();

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://orbit-ai-kohl.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/auth', authRouter); // Fallback for direct /auth routes

app.use('/api/v1/chat', chatRouter);
app.use('/chat', chatRouter); // Fallback for direct /chat routes

app.use('/api/v1/documents', documentsRouter);
app.use('/documents', documentsRouter); // Fallback for direct /documents routes

// Health check
app.get('/', (req, res) => {
  return res.json({
    app: settings.APP_NAME,
    version: settings.APP_VERSION,
    status: 'running',
    docs: '/docs'
  });
});

app.get('/health', (req, res) => {
  return res.json({ status: 'ok' });
});

// Global Exception Handler
app.use((err, req, res, next) => {
  console.error('Unhandled exception:', err);
  const status = err.status || 500;
  const message = err.message || 'An internal server error occurred.';
  return res.status(status).json({ detail: message });
});

const printNumbers = () => {
  let num = 1;
  setInterval(() => {
    console.log(num);
    num = num < 5 ? num + 1 : 1;
  }, 10 * 60 * 1000); // Every 10 minutes
}

printNumbers();
// Lifespan startup
async function startServer() {
  try {
    console.log(`🚀 Starting ${settings.APP_NAME} v${settings.APP_VERSION}`);
    await connectDb();
    
    const server = app.listen(settings.PORT, () => {
      console.log(`📡 Server listening on port ${settings.PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('👋 SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await disconnectDb();
        console.log('👋 Server shut down.');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

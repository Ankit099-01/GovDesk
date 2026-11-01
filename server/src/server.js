import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { connectAndSeedMongo } from './db/mongoInit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/govdesk';

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'GovDesk API Server',
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api', apiRoutes);

// Connect MongoDB and Seed
connectAndSeedMongo(MONGO_URI);

// Global 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🏛️  GovDesk Server running on http://127.0.0.1:${PORT}`);
  console.log(`📡 API Base: http://127.0.0.1:${PORT}/api`);
  console.log(`🗄️  Database: MongoDB (mongodb://127.0.0.1:27017/govdesk)`);
  console.log(`====================================================`);
});

export default app;

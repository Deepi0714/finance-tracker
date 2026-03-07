import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import { startCronJobs } from './services/cronService';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL,
  credentials: true,
}));

// ── Rate limiting ────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  message:  { error: 'Too many requests, please try again later.' },
}));

// ── Body parsing ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP logging ─────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: msg => logger.http(msg.trim()) },
}));

// ── Health check ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    version:   '1.0.0',
    database:  'supabase',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 FinanceTracker API running on http://localhost:${PORT}`);
  logger.info(`🗄️  Database: Supabase`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  startCronJobs();
});

export default app;

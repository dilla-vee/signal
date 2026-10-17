import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import calendarRoutes from './routes/calendar.js';
import signalsRoutes from './routes/signals.js';
import pricesRoutes from './routes/prices.js';
import reactionsRoutes from './routes/reactions.js';
import snapshotsRoutes from './routes/snapshots.js';
import agentsRoutes from './routes/agents.js';
import { startCalendarCron } from './jobs/calendarCron.js';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow frontend development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// Mount Routes
app.use('/api/health', healthRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/signals', signalsRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/reactions', reactionsRoutes);
app.use('/api/snapshots', snapshotsRoutes);
app.use('/api/agents', agentsRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Macro News Intelligence & Signal Platform API',
    pairs: ['XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'],
    status: 'online',
    disclaimer: 'Decision support & paper trading only. Not financial advice.'
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Export app for tests and conditional listener
let server = null;
if (process.env.NODE_ENV !== 'test' && !process.env.DISABLE_AUTO_START) {
  server = app.listen(config.port, () => {
    logger.info(`Macro Signal Server running on port ${config.port} [${config.nodeEnv}]`);
    startCalendarCron();
  });
}

export function closeServer() {
  if (server) {
    server.close();
  }
}

export default app;

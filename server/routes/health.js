import express from 'express';
import { formatApiResponse } from '../utils/apiResponse.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const healthData = {
    status: 'operational',
    service: 'macro-signal-server',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: supabaseAdmin ? 'connected' : 'mock_fallback',
    nodeVersion: process.version
  };

  res.status(200).json(formatApiResponse(healthData, 'System is healthy and operational'));
});

export default router;

import express from 'express';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';
import { supabaseAdmin } from '../config/supabase.js';
import { schedulerService } from '../jobs/schedulerService.js';

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

// GET /api/health/jobs
router.get('/jobs', (req, res) => {
  const report = schedulerService.getHealthReport();
  res.status(200).json(formatApiResponse(report, 'Scheduler job health status report'));
});

// POST /api/health/jobs/:id/run (Manually trigger job execution)
router.post('/jobs/:id/run', async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = schedulerService.jobs.get(id);
    if (!job) {
      return res.status(404).json(formatApiError('Not Found', `Job '${id}' not found`, 404));
    }
    await schedulerService.runJob(id);
    const updated = schedulerService.getHealthReport();
    res.json(formatApiResponse(updated, `Triggered job ${id} manually`));
  } catch (err) {
    next(err);
  }
});

export default router;

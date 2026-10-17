import express from 'express';
import { predictionTrackerService } from '../services/predictionTrackerService.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/performance/summary
router.get('/summary', optionalAuth, async (req, res, next) => {
  try {
    const { pair, eventType } = req.query;
    const summary = await predictionTrackerService.getPerformanceSummary({ pair, eventType });
    res.json(formatApiResponse(summary, 'Performance metrics and equity curve retrieved successfully'));
  } catch (err) {
    next(err);
  }
});

// GET /api/performance/agent-accuracy
router.get('/agent-accuracy', async (req, res, next) => {
  try {
    const leaderboard = await predictionTrackerService.getAgentAccuracyLeaderboard();
    res.json(formatApiResponse(leaderboard, 'Agent accuracy leaderboard and weight calibration retrieved'));
  } catch (err) {
    next(err);
  }
});

// POST /api/performance/record-outcome
router.post('/record-outcome', optionalAuth, async (req, res, next) => {
  try {
    const {
      signalId,
      actualEntryFilled,
      outcomeType,
      price15m,
      price1h,
      price4h,
      hitTp1,
      hitTp2,
      hitSl,
      riskRewardRatio,
      riskAmountUsd,
      pair,
      eventType,
      notes
    } = req.body;

    if (!signalId || !outcomeType) {
      return res.status(400).json(formatApiError('signalId and outcomeType are required', null, 400));
    }

    const recorded = await predictionTrackerService.recordSignalOutcome({
      signalId,
      actualEntryFilled,
      outcomeType,
      price15m,
      price1h,
      price4h,
      hitTp1,
      hitTp2,
      hitSl,
      riskRewardRatio: riskRewardRatio || 2.0,
      riskAmountUsd: riskAmountUsd || 100.0,
      pair: pair || 'XAUUSD',
      eventType: eventType || 'CPI',
      notes: notes || ''
    });

    res.json(formatApiResponse(recorded, 'Trade outcome recorded and accuracy updated'));
  } catch (err) {
    next(err);
  }
});

export default router;

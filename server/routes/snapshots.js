import express from 'express';
import { buildMarketSnapshot, getLatestSnapshotForPair } from '../services/marketSnapshotService.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

// GET /api/snapshots/latest/:pair
router.get('/latest/:pair', async (req, res, next) => {
  try {
    const { pair } = req.params;
    const snapshot = await getLatestSnapshotForPair(pair);
    res.json(formatApiResponse(snapshot, `Point-in-time market snapshot for ${pair.toUpperCase()}`));
  } catch (err) {
    next(err);
  }
});

// POST /api/snapshots/build
router.post('/build', async (req, res, next) => {
  try {
    const { eventId, pair = 'XAUUSD' } = req.body;
    const snapshot = await buildMarketSnapshot({ eventId, pair });
    res.json(formatApiResponse(snapshot, `Built market snapshot for ${pair.toUpperCase()}`));
  } catch (err) {
    next(err);
  }
});

export default router;

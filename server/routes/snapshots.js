import express from 'express';
import { buildMarketSnapshot, getLatestSnapshotForPair } from '../services/marketSnapshotService.js';
import { marketDataService } from '../services/marketDataService.js';
import { formatApiResponse } from '../utils/apiResponse.js';

const router = express.Router();

// GET /api/snapshots/ticker
router.get('/ticker', async (req, res, next) => {
  try {
    const telemetry = await marketDataService.getTickerTelemetry();
    res.json(formatApiResponse(telemetry, 'Live Cross-Asset Macro Telemetry'));
  } catch (err) {
    next(err);
  }
});

// GET /api/snapshots/quote/:pair
router.get('/quote/:pair', async (req, res, next) => {
  try {
    const { pair } = req.params;
    const quote = await marketDataService.getLiveQuoteForPair(pair);
    res.json(formatApiResponse(quote, `Live quote for ${pair.toUpperCase()}`));
  } catch (err) {
    next(err);
  }
});

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

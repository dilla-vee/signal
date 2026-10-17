import express from 'express';
import { getHistoricalReactions, calculateEventReaction } from '../services/reactionEngineService.js';
import { supabaseAdmin } from '../config/supabase.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

// GET /api/reactions
router.get('/', async (req, res, next) => {
  try {
    const { eventType = 'CPI', pair = 'XAUUSD' } = req.query;
    const result = await getHistoricalReactions(eventType, pair);
    res.json(formatApiResponse(result, `Historical reactions for ${eventType} on ${pair.toUpperCase()}`));
  } catch (err) {
    next(err);
  }
});

// POST /api/reactions/calculate
router.post('/calculate', async (req, res, next) => {
  try {
    const { eventId, pair, releaseTime, candles } = req.body;
    if (!eventId || !pair || !releaseTime || !candles) {
      return res.status(400).json(formatApiError('Missing required parameters for reaction calculation', null, 400));
    }

    const reaction = calculateEventReaction({ eventId, pair, releaseTime, candles });

    if (supabaseAdmin) {
      await supabaseAdmin.from('reactions').insert(reaction);
    }

    res.json(formatApiResponse(reaction, 'Calculated and logged empirical event reaction'));
  } catch (err) {
    next(err);
  }
});

export default router;

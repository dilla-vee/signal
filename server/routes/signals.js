import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';
import { calculateTradeParameters } from '../utils/tradeCalculations.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/signals/latest
router.get('/latest', optionalAuth, async (req, res, next) => {
  try {
    if (supabaseAdmin) {
      let query = supabaseAdmin
        .from('signals')
        .select(`
          *,
          events (
            id, event_name, event_type, country, currency, release_time, impact_level, forecast_val, previous_val
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json(formatApiResponse(data, 'Latest pre-news trading signals'));
      }
    }

    // High fidelity fallback signal for XAUUSD pre-news
    const fallbackSignals = [
      {
        id: 'mock-sig-001',
        pair: 'XAUUSD',
        direction: 'BUY',
        confidence_pct: 72,
        timing: 'post_news_confirmation',
        suggested_entry: 2654.50,
        entry_zone_min: 2650.00,
        entry_zone_max: 2656.00,
        stop_loss: 2638.00,
        take_profit_1: 2675.00,
        take_profit_2: 2692.00,
        risk_reward_ratio: 2.28,
        position_size_lots: 0.60,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        key_drivers: [
          'Consensus 3.1% YoY with downside skew in shelter index',
          'Fed dovish bias caps USD rally on headline beat',
          'Persistent safe-haven demand on geopolitical uncertainty'
        ],
        key_risks: [
          'Sticky headline energy MoM could produce a transient dollar spike',
          'Anticipate spread widening up to $1.80 on the release tick'
        ],
        dev_advocate_objections: [
          'US 10Y yield support at 4.00% is robust; wait for the 5-minute candle to close above 2655 before filling.'
        ],
        agreed_agents: ['Fundamentals', 'Central Bank', 'Rates & Yields', 'Technical Structure', 'Geopolitical'],
        disagreed_agents: ['Cross-Asset Sentiment', 'Positioning'],
        events: {
          id: 'mock-event-1',
          event_name: 'US Consumer Price Index (YoY)',
          event_type: 'CPI',
          currency: 'USD',
          release_time: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
          impact_level: 'HIGH',
          forecast_val: '3.1%',
          previous_val: '3.2%'
        }
      },
      {
        id: 'mock-sig-002',
        pair: 'USDJPY',
        direction: 'SELL',
        confidence_pct: 68,
        timing: 'post_news_confirmation',
        suggested_entry: 149.80,
        entry_zone_min: 149.60,
        entry_zone_max: 150.05,
        stop_loss: 150.70,
        take_profit_1: 148.40,
        take_profit_2: 147.20,
        risk_reward_ratio: 2.33,
        position_size_lots: 0.35,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        key_drivers: [
          'BoJ policy normalization ongoing; MoF verbal warnings active near 151',
          'US-Japan yield spread compressing from 3.35% toward 3.15%'
        ],
        key_risks: [
          'Broad USD squeeze if Core CPI beats by +0.2%'
        ],
        dev_advocate_objections: [
          'Carry unwind momentum has paused; do not short if US 2Y yield breaks above 4.10%.'
        ],
        agreed_agents: ['Central Bank', 'Rates & Yields', 'Positioning', 'Geopolitical'],
        disagreed_agents: ['Technical Structure'],
        events: {
          id: 'mock-event-3',
          event_name: 'Bank of Japan Monetary Policy Decision & Statement',
          event_type: 'BOJ_DECISION',
          currency: 'JPY',
          release_time: new Date(Date.now() + 840 * 60 * 1000).toISOString(),
          impact_level: 'HIGH',
          forecast_val: '0.25%',
          previous_val: '0.25%'
        }
      }
    ];

    res.json(formatApiResponse(fallbackSignals, 'Latest pre-news trading signals'));
  } catch (err) {
    next(err);
  }
});

// POST /api/signals/calculate-trade
router.post('/calculate-trade', (req, res, next) => {
  try {
    const { pair, direction, entryPrice, stopLoss, takeProfit1, takeProfit2, accountBalance, riskPct } = req.body;
    if (!pair || !direction || !entryPrice || !stopLoss || !takeProfit1) {
      return res.status(400).json(formatApiError('Missing required parameters for trade calculation', null, 400));
    }

    const calculated = calculateTradeParameters({
      pair,
      direction,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      accountBalance: accountBalance || 10000,
      riskPct: riskPct || 1.0
    });

    res.json(formatApiResponse(calculated, 'Trade parameters calculated successfully'));
  } catch (err) {
    next(err);
  }
});

export default router;

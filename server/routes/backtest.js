import express from 'express';
import { backtesterService } from '../services/backtesterService.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

// POST /api/backtest/run
router.post('/run', async (req, res, next) => {
  try {
    const {
      pair = 'XAUUSD',
      eventType = 'ALL',
      accountBalance = 10000,
      riskPct = 1.0,
      spreadBufferPips = 2.5,
      slippagePips = 1.0,
      minConfidence = 60
    } = req.body;

    const results = await backtesterService.runBacktest({
      pair,
      eventType,
      accountBalance: Number(accountBalance) || 10000,
      riskPct: Number(riskPct) || 1.0,
      spreadBufferPips: Number(spreadBufferPips) || 2.5,
      slippagePips: Number(slippagePips) || 1.0,
      minConfidence: Number(minConfidence) || 60
    });

    res.json(formatApiResponse(results, `Backtest completed for ${pair} (${eventType})`));
  } catch (err) {
    next(err);
  }
});

// GET /api/backtest/presets
router.get('/presets', (req, res) => {
  const presets = [
    {
      id: 'xauusd-cpi',
      name: 'Gold vs US CPI Strategy',
      pair: 'XAUUSD',
      eventType: 'CPI',
      description: 'Pre-news limits with 1.2x ATR buffer outside key support on US inflation releases.'
    },
    {
      id: 'usdjpy-boj',
      name: 'USDJPY BoJ Rate Decisions',
      pair: 'USDJPY',
      eventType: 'BOJ_DECISION',
      description: 'Carry trade unwind momentum filter with Ministry of Finance intervention protection.'
    },
    {
      id: 'xauusd-nfp',
      name: 'Gold vs Non-Farm Payrolls',
      pair: 'XAUUSD',
      eventType: 'NFP',
      description: 'Post-news confirmation entry avoiding the initial 60-second spread blowout.'
    },
    {
      id: 'all-macro',
      name: 'Comprehensive Macro Cross-Asset Playbook',
      pair: 'ALL',
      eventType: 'ALL',
      description: 'Full portfolio paper test across Gold and all 4 JPY pairs.'
    }
  ];

  res.json(formatApiResponse(presets, 'Backtest preset profiles retrieved'));
});

export default router;

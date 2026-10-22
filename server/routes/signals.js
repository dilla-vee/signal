import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';
import { calculateTradeParameters } from '../utils/tradeCalculations.js';
import { optionalAuth } from '../middleware/auth.js';
import { runFullSignalPipeline, localScenarioStore } from '../services/agentCoordinatorService.js';
import { postReleaseService, localSignalStore } from '../services/postReleaseService.js';
import { calendarService } from '../services/calendarService.js';

const router = express.Router();

// GET /api/signals/latest
router.get('/latest', optionalAuth, async (req, res, next) => {
  try {
    const now = Date.now();
    const memorySignals = Array.from(localSignalStore.values());
    let rawSignals = memorySignals;

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
        .limit(20);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        rawSignals = [...memorySignals, ...data.filter(d => !localSignalStore.has(d.id))];
      }
    }

    if (rawSignals.length === 0) {
      return res.json(formatApiResponse([], 'No active pre-news trading signals recorded'));
    }

    // 1. Process Expiration: mark signals past event release time as EXPIRED
    const processedSignals = rawSignals.map(sig => {
      const releaseIso = sig.release_time || sig.events?.release_time;
      const expireIso = sig.expires_at || releaseIso;
      const isExpired = expireIso ? (now > new Date(expireIso).getTime()) : false;
      const finalStatus = isExpired && sig.status === 'ACTIVE' ? 'EXPIRED' : sig.status;

      return {
        ...sig,
        status: finalStatus,
        is_expired: isExpired,
        expires_at: expireIso
      };
    });

    // 2. Deduplicate: Never show two conflicting copies of the same signal for a pair.
    // Group by pair and prioritize the most recently created ACTIVE signal, or most recent overall.
    const pairMap = new Map();
    for (const sig of processedSignals) {
      const pair = sig.pair;
      if (!pairMap.has(pair)) {
        pairMap.set(pair, sig);
      } else {
        const existing = pairMap.get(pair);
        // If current is ACTIVE and existing is not, prioritize current
        if (sig.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
          pairMap.set(pair, sig);
        } else if (sig.status === existing.status) {
          // Both active or both non-active: pick the newer one
          if (new Date(sig.created_at).getTime() > new Date(existing.created_at).getTime()) {
            pairMap.set(pair, sig);
          }
        }
      }
    }

    const deduplicatedSignals = Array.from(pairMap.values());
    return res.json(formatApiResponse(deduplicatedSignals, 'Latest deduplicated pre-news trading signals'));
  } catch (err) {
    next(err);
  }
});

// POST /api/signals/generate (Run full 11-agent AI pipeline)
router.post('/generate', optionalAuth, async (req, res, next) => {
  try {
    const { eventId, pair = 'XAUUSD', userRules = {} } = req.body;
    let targetEventId = eventId;
    if (!targetEventId) {
      const upcoming = await calendarService.getUpcomingEvents({ limit: 1, impact: 'ALL' });
      targetEventId = upcoming[0]?.id;
    }

    if (!targetEventId) {
      return res.status(422).json(formatApiError('Validation Error', 'Event ID is required to generate an AI signal. Real inputs must exist for this event.', 422));
    }

    const result = await runFullSignalPipeline({
      eventId: targetEventId,
      pair,
      userRules: {
        ...userRules,
        user_id: req.user?.id || null
      }
    });

    res.json(formatApiResponse(result, `Full 11-agent playbook and pre-news signal generated for ${pair}`));
  } catch (err) {
    if (err.message && err.message.includes('Real inputs required')) {
      return res.status(422).json(formatApiError('Missing Real Inputs', err.message, 422));
    }
    next(err);
  }
});

// GET /api/signals/event/:eventId (Get scenario matrix & signals for an event)
router.get('/event/:eventId', async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const pair = (req.query.pair || 'XAUUSD').toUpperCase();

    // 1. Check local scenario store
    let scenarioData = localScenarioStore.get(eventId);

    // 2. Check Supabase
    if (!scenarioData && supabaseAdmin) {
      const { data: scenarios, error } = await supabaseAdmin
        .from('scenarios')
        .select('*')
        .eq('event_id', eventId)
        .eq('pair', pair);

      if (!error && scenarios && scenarios.length > 0) {
        scenarioData = {
          eventId,
          pair,
          scenarios
        };
      }
    }

    // 3. If still empty, generate fallback 5-point matrix
    if (!scenarioData) {
      scenarioData = {
        eventId,
        pair,
        scenarios: [
          {
            scenario_key: 'MUCH_HOTTER',
            scenario_name: 'Much Hotter Than Expected',
            condition_description: 'Actual >= Forecast + 0.3%',
            probability_pct: 15,
            expected_first_reaction: pair === 'XAUUSD' ? 'Immediate sell-off -120 pips' : 'Surge +90 pips',
            expected_follow_through: 'Sustained momentum testing key boundaries',
            conditional_action: pair === 'XAUUSD' ? 'SELL on 1m pullback' : 'BUY dips above support',
            invalidation_level: pair === 'XAUUSD' ? 2665.00 : 149.20,
            risk_notes: 'Spread widening and high slippage on release',
            expected_value_rating: pair === 'XAUUSD' ? 'NEGATIVE_ASYMMETRIC' : 'POSITIVE_HIGH'
          },
          {
            scenario_key: 'SLIGHTLY_HOTTER',
            scenario_name: 'Slightly Hotter Than Expected',
            condition_description: 'Actual +0.1% to +0.2% above Forecast',
            probability_pct: 25,
            expected_first_reaction: pair === 'XAUUSD' ? 'Drop -50 pips' : 'Rally +40 pips',
            expected_follow_through: 'Mean reversion risk within 15m',
            conditional_action: 'Wait for 5m confirmation',
            invalidation_level: pair === 'XAUUSD' ? 2660.00 : 149.50,
            risk_notes: 'High probability of reversal',
            expected_value_rating: 'POSITIVE_MODERATE'
          },
          {
            scenario_key: 'IN_LINE',
            scenario_name: 'In-Line with Consensus',
            condition_description: 'Actual matches Forecast ±0.0%',
            probability_pct: 25,
            expected_first_reaction: 'Two-way whipsaw within 25 pips',
            expected_follow_through: 'Reverts to prior technical trend',
            conditional_action: 'WAIT - Do not enter',
            invalidation_level: pair === 'XAUUSD' ? 2655.00 : 150.00,
            risk_notes: 'Spread costs will consume edge',
            expected_value_rating: 'NEUTRAL'
          },
          {
            scenario_key: 'SLIGHTLY_COOLER',
            scenario_name: 'Slightly Cooler Than Expected',
            condition_description: 'Actual -0.1% to -0.2% below Forecast',
            probability_pct: 25,
            expected_first_reaction: pair === 'XAUUSD' ? 'Bounce +60 pips' : 'Slip -45 pips',
            expected_follow_through: 'Grinding continuation',
            conditional_action: pair === 'XAUUSD' ? 'BUY dips' : 'SELL rallies',
            invalidation_level: pair === 'XAUUSD' ? 2640.00 : 150.80,
            risk_notes: 'Check revisions to prior month',
            expected_value_rating: 'POSITIVE_MODERATE'
          },
          {
            scenario_key: 'MUCH_COOLER',
            scenario_name: 'Much Cooler Than Expected',
            condition_description: 'Actual <= Forecast - 0.3%',
            probability_pct: 10,
            expected_first_reaction: pair === 'XAUUSD' ? 'Explosive rally +150 pips' : 'Cascade lower -100 pips',
            expected_follow_through: 'Multi-hour trend continuation',
            conditional_action: pair === 'XAUUSD' ? 'BUY breakout' : 'SELL aggressively',
            invalidation_level: pair === 'XAUUSD' ? 2635.00 : 151.20,
            risk_notes: 'Chasing market orders exposes trader to top/bottom tick',
            expected_value_rating: pair === 'XAUUSD' ? 'POSITIVE_HIGH' : 'NEGATIVE_ASYMMETRIC'
          }
        ]
      };
    }

    res.json(formatApiResponse(scenarioData, 'Pre-news scenario playbook retrieved'));
  } catch (err) {
    next(err);
  }
});

// POST /api/signals/:id/post-release (Evaluate actual release result)
router.post('/:id/post-release', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actualValue, currentPrice, eventForecast, scenarioMatrix } = req.body;

    if (actualValue === undefined) {
      return res.status(400).json(formatApiError('actualValue is required to evaluate post-release outcome', null, 400));
    }

    const updatedSignal = await postReleaseService.evaluateRelease({
      signalId: id,
      actualValue,
      currentPrice,
      eventForecast,
      scenarioMatrix
    });

    res.json(formatApiResponse(updatedSignal, `Signal ${id} re-evaluated with actual release`));
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

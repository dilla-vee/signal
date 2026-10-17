import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';
import { calculateTradeParameters } from '../utils/tradeCalculations.js';
import { optionalAuth } from '../middleware/auth.js';
import { runFullSignalPipeline, localScenarioStore } from '../services/agentCoordinatorService.js';
import { postReleaseService, localSignalStore } from '../services/postReleaseService.js';

const router = express.Router();

// GET /api/signals/latest
router.get('/latest', optionalAuth, async (req, res, next) => {
  try {
    const memorySignals = Array.from(localSignalStore.values());

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
        // Merge with memory signals if any
        const combined = [...memorySignals, ...data.filter(d => !localSignalStore.has(d.id))];
        return res.json(formatApiResponse(combined, 'Latest pre-news trading signals'));
      }
    }

    if (memorySignals.length > 0) {
      return res.json(formatApiResponse(memorySignals, 'Latest pre-news trading signals'));
    }

    // High fidelity fallback signal for XAUUSD pre-news
    const fallbackSignals = [
      {
        id: 'mock-sig-001',
        pair: 'XAUUSD',
        direction: 'BUY',
        confidence_pct: 74,
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
          'COT speculative long positioning is in the 90th percentile — asymmetric downside risk if data surprises hot',
          'TIPS 10-year real yield remains elevated at ~1.95%, creating strong economic drag on non-yielding bullion'
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
          'Intervention risk is maximum in the 151.00-152.00 zone, but overnight carry yield remains heavily negative for short USDJPY.'
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

// POST /api/signals/generate (Run full 11-agent AI pipeline)
router.post('/generate', optionalAuth, async (req, res, next) => {
  try {
    const { eventId, pair = 'XAUUSD', userRules = {} } = req.body;
    const result = await runFullSignalPipeline({
      eventId,
      pair,
      userRules: {
        ...userRules,
        user_id: req.user?.id || null
      }
    });

    res.json(formatApiResponse(result, `Full 11-agent playbook and pre-news signal generated for ${pair}`));
  } catch (err) {
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

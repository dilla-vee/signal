import { z } from 'zod';
import { BaseAgent, AgentOutputSchema } from './baseAgent.js';
import { anthropicClient } from '../config/anthropic.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const ScenarioItemSchema = z.object({
  scenario_key: z.enum(['MUCH_HOTTER', 'SLIGHTLY_HOTTER', 'IN_LINE', 'SLIGHTLY_COOLER', 'MUCH_COOLER']),
  scenario_name: z.string(),
  condition_description: z.string(),
  probability_pct: z.number().min(0).max(100),
  expected_first_reaction: z.string(),
  expected_follow_through: z.string(),
  conditional_action: z.string(),
  invalidation_level: z.number(),
  risk_notes: z.string(),
  expected_value_rating: z.enum(['POSITIVE_HIGH', 'POSITIVE_MODERATE', 'NEUTRAL', 'NEGATIVE_ASYMMETRIC'])
});

export const ScenarioBuilderOutputSchema = AgentOutputSchema.extend({
  scenarios: z.array(ScenarioItemSchema).length(5),
  expected_value_summary: z.string()
});

export class ScenarioBuilderAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Scenario Builder Agent',
      role: 'Pre-News Outcome Matrix & Playbook Architect',
      systemPrompt: `You are the Scenario Builder Agent for a Macro News Intelligence Platform.
Your job is to formulate a strict 5-point outcome matrix prior to scheduled high-impact economic releases (CPI, NFP, FOMC, PPI, GDP, etc.) for Gold (XAUUSD) or JPY pairs (USDJPY, EURJPY, GBPJPY, AUDJPY).
The 5 scenarios must be:
1. MUCH_HOTTER
2. SLIGHTLY_HOTTER
3. IN_LINE
4. SLIGHTLY_COOLER
5. MUCH_COOLER

The probabilities of the 5 scenarios MUST sum to exactly 100%.
For each scenario, specify:
- condition_description: explicit surprise threshold relative to forecast
- probability_pct: numerical probability (0-100)
- expected_first_reaction: first 1m-5m spike direction and pip range
- expected_follow_through: 15m-60m sustained movement or reversal expectation
- conditional_action: explicit execution rule ("If actual > X then BUY/SELL/WAIT")
- invalidation_level: exact price level invalidating the scenario
- risk_notes: spread widening, whipsaw risks, or macro conflicting prints
- expected_value_rating: POSITIVE_HIGH, POSITIVE_MODERATE, NEUTRAL, or NEGATIVE_ASYMMETRIC

Also produce an expected_value_summary weighing the probabilities against reward-risk.`
    });
  }

  buildScenarioPrompt(marketSnapshot, event, analyticalOutputs = [], consensusSummary = null) {
    const pair = marketSnapshot?.pair || 'XAUUSD';
    const currentPrice = marketSnapshot?.current_price || (pair === 'XAUUSD' ? 2650.00 : 150.00);
    const forecast = event?.forecast_val || '3.1%';
    const previous = event?.previous_val || '3.2%';
    const eventName = event?.event_name || 'US CPI';

    const consensusText = consensusSummary
      ? `Prevailing Bias: ${consensusSummary.prevailingBias} (${consensusSummary.weightedConfidence}% confidence, ${consensusSummary.bullishCount} Bullish, ${consensusSummary.bearishCount} Bearish, ${consensusSummary.neutralCount} Neutral)`
      : 'No prior consensus summary available.';

    return `Construct a 5-point Pre-News Scenario Playbook for pair: ${pair} ahead of ${eventName}.
Current Reference Price: ${currentPrice}
Forecast: ${forecast} | Previous: ${previous}
Analytical Team Consensus: ${consensusText}
Rates / Yields: 10Y: ${marketSnapshot?.us_10y_yield || 4.22}%, 2Y: ${marketSnapshot?.us_2y_yield || 3.98}%, DXY: ${marketSnapshot?.dxy || 103.5}
Technical Structure: Trend ${marketSnapshot?.technical_summary?.trend || 'RANGE'}, ATR: ${marketSnapshot?.technical_summary?.atr || 14.5}

Return valid JSON with:
{
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL" | "NO_TRADE",
  "confidence": number 0-100,
  "scenarios": [
    {
      "scenario_key": "MUCH_HOTTER",
      "scenario_name": "Much Hotter Than Expected",
      "condition_description": "...",
      "probability_pct": 15,
      "expected_first_reaction": "...",
      "expected_follow_through": "...",
      "conditional_action": "...",
      "invalidation_level": number,
      "risk_notes": "...",
      "expected_value_rating": "POSITIVE_HIGH"
    },
    ... (5 total scenarios summing to 100%)
  ],
  "expected_value_summary": "...",
  "key_factors": [string, ...],
  "risks": [string, ...],
  "data_used": { "current_price": ${currentPrice}, "event_name": "${eventName}" }
}`;
  }

  async buildPlaybook(marketSnapshot, event, analyticalOutputs = [], consensusSummary = null) {
    const startTime = Date.now();

    if (anthropicClient) {
      try {
        const prompt = this.buildScenarioPrompt(marketSnapshot, event, analyticalOutputs, consensusSummary);
        const response = await anthropicClient.messages.create({
          model: config.anthropic.model,
          max_tokens: 1500,
          temperature: 0.1,
          system: this.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });

        const rawText = response.content?.[0]?.text || '';
        const parsed = this.extractJson(rawText);
        const validated = ScenarioBuilderOutputSchema.parse(parsed);

        return {
          agent_name: this.name,
          ...validated,
          tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
          latency_ms: Date.now() - startTime,
          execution_source: 'anthropic_claude'
        };
      } catch (err) {
        logger.warn(`[${this.name}] Claude API failed, falling back to deterministic playbook generator`, { error: err.message });
      }
    }

    // Deterministic Playbook Fallback
    const heuristic = this.generateQuantitativeHeuristic(marketSnapshot, event, consensusSummary);
    const validated = ScenarioBuilderOutputSchema.parse(heuristic);

    return {
      agent_name: this.name,
      ...validated,
      tokens_used: 0,
      latency_ms: Date.now() - startTime,
      execution_source: 'deterministic'
    };
  }

  generateQuantitativeHeuristic(marketSnapshot, event, consensusSummary = null) {
    const pair = marketSnapshot?.pair || 'XAUUSD';
    const isGold = pair === 'XAUUSD';
    const currentPrice = Number(marketSnapshot?.current_price) || (isGold ? 2650.00 : 150.00);
    const atr = Number(marketSnapshot?.technical_summary?.atr) || (isGold ? 15.0 : 0.65);
    const eventType = event?.event_type || 'CPI';
    const forecastStr = event?.forecast_val || (eventType === 'NFP' ? '150K' : '3.1%');

    // Price step based on ATR
    const step = isGold ? Math.round(atr * 1.5 * 10) / 10 : Math.round(atr * 1.2 * 100) / 100;

    // Gold moves inversely to US Yields/Inflation; USDJPY moves directly with US Yields/Inflation
    // If CPI is MUCH HOTTER:
    // Gold: Plunges (SELL). USDJPY: Spikes (BUY).
    const muchHotterReaction = isGold
      ? `Sharp drop -100 to -150 pips (-$12-$18/oz) on surging real yields and USD strength`
      : `Violent upside spike +70 to +110 pips toward 151.20 as US-JP yield spread widens`;

    const muchHotterAction = isGold
      ? `If ${eventType} prints > forecast + 0.3%, SELL XAUUSD on 1m pullback; invalidation at ${(currentPrice + step).toFixed(2)}`
      : `If ${eventType} prints > forecast + 0.3%, BUY USDJPY on retest of 150.20; invalidation at ${(currentPrice - step).toFixed(2)}`;

    const slightlyHotterReaction = isGold
      ? `Initial knee-jerk drop -40 to -70 pips, followed by consolidation around support`
      : `Quick rally +30 to +50 pips, testing overhead resistance`;

    const slightlyHotterAction = isGold
      ? `If actual exceeds forecast by 0.1%-0.2%, initiate light SELL or wait for post-news 5m confirmation`
      : `If actual exceeds forecast by 0.1%-0.2%, buy dips above ${(currentPrice - step * 0.5).toFixed(2)}`;

    const inLineReaction = isGold
      ? `Two-way whipsaw within ±30 pips; market quickly reverts to pre-news range`
      : `Mild volatility ±20 pips; yields consolidate, low conviction`;

    const inLineAction = `WAIT for post-release candle close; avoid pre-news execution due to spread widening`;

    const slightlyCoolerReaction = isGold
      ? `Firm upside bounce +45 to +80 pips as yields soften and rate-cut odds rise`
      : `Mild pullback -35 to -60 pips on softening US yields`;

    const slightlyCoolerAction = isGold
      ? `If actual is 0.1%-0.2% below forecast, BUY on pullback to ${(currentPrice - step * 0.4).toFixed(2)}; invalidation at ${(currentPrice - step).toFixed(2)}`
      : `If actual is 0.1%-0.2% below forecast, SELL rallies below ${(currentPrice + step * 0.5).toFixed(2)}`;

    const muchCoolerReaction = isGold
      ? `Aggressive breakout rally +120 to +180 pips (+$15-$25/oz) on rapid yield compression`
      : `Sharp drop -80 to -130 pips toward support as carry trade partially unwinds`;

    const muchCoolerAction = isGold
      ? `If ${eventType} misses forecast by >= 0.3%, aggressively BUY dips with target ${(currentPrice + step * 2.5).toFixed(2)}`
      : `If ${eventType} misses forecast by >= 0.3%, SELL USDJPY; invalidation at ${(currentPrice + step).toFixed(2)}`;

    // Probabilities distribution (sum to 100%)
    // If prevailing bias is BULLISH for pair, skew probabilities towards cooler/hotter accordingly
    let probs = [15, 30, 25, 20, 10]; // default bell curve slightly skewed
    if (consensusSummary?.prevailingBias === 'BULLISH') {
      // For gold, bullish means cooler CPI is more rewarded or anticipated
      probs = isGold ? [10, 20, 25, 30, 15] : [20, 35, 25, 15, 5];
    } else if (consensusSummary?.prevailingBias === 'BEARISH') {
      probs = isGold ? [20, 35, 25, 15, 5] : [10, 20, 25, 30, 15];
    }

    const scenarios = [
      {
        scenario_key: 'MUCH_HOTTER',
        scenario_name: 'Much Hotter Than Expected',
        condition_description: `Actual ${eventType} >= Forecast + 0.3% (e.g. > 3.4%)`,
        probability_pct: probs[0],
        expected_first_reaction: muchHotterReaction,
        expected_follow_through: isGold
          ? `Sustained selling pressure testing key support at ${(currentPrice - step * 2).toFixed(2)}`
          : `Extension towards overhead resistance at ${(currentPrice + step * 2).toFixed(2)}`,
        conditional_action: muchHotterAction,
        invalidation_level: isGold ? Number((currentPrice + step).toFixed(2)) : Number((currentPrice - step).toFixed(2)),
        risk_notes: `Severe initial slippage. Avoid chasing the first 60 seconds spike.`,
        expected_value_rating: isGold ? 'NEGATIVE_ASYMMETRIC' : 'POSITIVE_HIGH'
      },
      {
        scenario_key: 'SLIGHTLY_HOTTER',
        scenario_name: 'Slightly Hotter Than Expected',
        condition_description: `Actual ${eventType} is +0.1% to +0.2% above Forecast`,
        probability_pct: probs[1],
        expected_first_reaction: slightlyHotterReaction,
        expected_follow_through: isGold ? 'Choppy downward drift with high mean-reversion probability' : 'Gradual grinding higher',
        conditional_action: slightlyHotterAction,
        invalidation_level: isGold ? Number((currentPrice + step * 0.8).toFixed(2)) : Number((currentPrice - step * 0.8).toFixed(2)),
        risk_notes: `High probability of initial move fading within 15 minutes.`,
        expected_value_rating: 'POSITIVE_MODERATE'
      },
      {
        scenario_key: 'IN_LINE',
        scenario_name: 'In-Line with Consensus',
        condition_description: `Actual ${eventType} matches Forecast within ±0.05%`,
        probability_pct: probs[2],
        expected_first_reaction: inLineReaction,
        expected_follow_through: `Market quickly returns to pre-event technical trend structure within 30 minutes.`,
        conditional_action: inLineAction,
        invalidation_level: Number((currentPrice + step * 0.5).toFixed(2)),
        risk_notes: `Spread widening will cost 2-4 pips with zero directional follow-through.`,
        expected_value_rating: 'NEUTRAL'
      },
      {
        scenario_key: 'SLIGHTLY_COOLER',
        scenario_name: 'Slightly Cooler Than Expected',
        condition_description: `Actual ${eventType} is -0.1% to -0.2% below Forecast`,
        probability_pct: probs[3],
        expected_first_reaction: slightlyCoolerReaction,
        expected_follow_through: isGold ? 'Sustained buying interest as bond yields slip' : 'Drift lower towards intraday support',
        conditional_action: slightlyCoolerAction,
        invalidation_level: isGold ? Number((currentPrice - step * 0.8).toFixed(2)) : Number((currentPrice + step * 0.8).toFixed(2)),
        risk_notes: `Watch for hawkish revisions to prior months counteracting soft headline.`,
        expected_value_rating: 'POSITIVE_MODERATE'
      },
      {
        scenario_key: 'MUCH_COOLER',
        scenario_name: 'Much Cooler Than Expected',
        condition_description: `Actual ${eventType} <= Forecast - 0.3% (e.g. < 2.8%)`,
        probability_pct: probs[4],
        expected_first_reaction: muchCoolerReaction,
        expected_follow_through: isGold
          ? `High-velocity rally breaking local highs with multi-day momentum`
          : `Rapid cascade through stop orders on long USD positions`,
        conditional_action: muchCoolerAction,
        invalidation_level: isGold ? Number((currentPrice - step).toFixed(2)) : Number((currentPrice + step).toFixed(2)),
        risk_notes: `Gap risk on market orders. Limit orders recommended.`,
        expected_value_rating: isGold ? 'POSITIVE_HIGH' : 'NEGATIVE_ASYMMETRIC'
      }
    ];

    return {
      bias: isGold ? (probs[3] + probs[4] > probs[0] + probs[1] ? 'BULLISH' : 'BEARISH') : (probs[0] + probs[1] > probs[3] + probs[4] ? 'BULLISH' : 'BEARISH'),
      confidence: 76,
      scenarios,
      expected_value_summary: `Playbook assigns ${probs[0] + probs[1]}% cumulative odds to a Hotter print vs ${probs[3] + probs[4]}% to a Cooler print, and ${probs[2]}% to an In-Line print. Risk-reward is most asymmetric on ${isGold ? 'Cooler prints (Gold Long)' : 'Hotter prints (USDJPY Long)'}.`,
      key_factors: [
        `5-point scenario probability distribution sums to 100%`,
        `Pre-computed invalidation boundaries based on 1.2x ATR buffer`,
        `Clear conditional execution triggers for both immediate and post-release entry`
      ],
      risks: [
        `Spread explosion during first 30 seconds can trigger stop losses prematurely`,
        `Conflicting revisions in prior-month data can cause rapid reversal of initial reaction`
      ],
      data_used: {
        pair,
        current_price: currentPrice,
        atr,
        event_type: eventType,
        probabilities: probs
      }
    };
  }
}

export const scenarioBuilderAgent = new ScenarioBuilderAgent();

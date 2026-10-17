import { z } from 'zod';
import { BaseAgent } from './baseAgent.js';
import { anthropicClient } from '../config/anthropic.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { calculateTradeParameters } from '../utils/tradeCalculations.js';

export const JudgeSignalOutputSchema = z.object({
  direction: z.enum(['BUY', 'SELL', 'NO_TRADE']),
  confidence_pct: z.number().int().min(0).max(100),
  timing: z.enum(['pre_news_limit', 'post_news_confirmation', 'wait']),
  suggested_entry: z.number(),
  entry_zone_min: z.number(),
  entry_zone_max: z.number(),
  stop_loss: z.number(),
  take_profit_1: z.number(),
  take_profit_2: z.number().nullable(),
  risk_reward_ratio: z.number(),
  position_size_lots: z.number(),
  key_drivers: z.array(z.string()),
  key_risks: z.array(z.string()),
  devils_advocate_objections: z.array(z.string()),
  agreed_agents: z.array(z.string()),
  disagreed_agents: z.array(z.string()),
  reasoning_synthesis: z.string(),
  status: z.enum(['ACTIVE', 'CONFIRMED', 'FLIPPED', 'CANCELLED', 'EXPIRED']).default('ACTIVE')
});

export class JudgeAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Judge / Synthesizer Agent',
      role: 'Supreme Decision Arbiter & Execution Synthesizer',
      systemPrompt: `You are the Judge and Chief Investment Officer for a Macro News Intelligence & Signal Platform.
You receive:
1. Outputs from 8 specialized macroeconomic and technical agents
2. Consensus summary and agent votes
3. 5-point Scenario Matrix from the Scenario Builder
4. Contrarian attack and vulnerability score from the Devil's Advocate
5. User risk rules and account settings

Your mission:
- Weigh all evidence impartially.
- Resolve conflicts between fundamental drivers, yield spreads, positioning, and technical structures.
- Apply strict risk parameters: if agents are evenly split, confidence is under threshold, or binary risk is too severe, choose NO_TRADE. Do NOT force a trade.
- If a high-conviction edge exists, decide BUY or SELL with exact pre-news entry points, stop-loss (incorporating ATR buffers), and take-profit targets.
- Recommend timing: 'pre_news_limit' (only for high conviction with clear technical boundaries) or 'post_news_confirmation' (default for high-impact releases due to spread spikes).
- List agreed and disagreed agents, and embed Devil's Advocate objections so the trader sees what could go wrong.`
    });
  }

  buildPrompt(marketSnapshot, event, analyticalOutputs, consensusSummary, scenarioPlaybook, devilsAdvocate, userRules) {
    const pair = marketSnapshot?.pair || 'XAUUSD';
    const currentPrice = marketSnapshot?.current_price || (pair === 'XAUUSD' ? 2650.00 : 150.00);

    return `Synthesize a finalized Pre-News Signal for ${pair} ahead of ${event?.event_name || 'US CPI'}.
Current Reference Price: ${currentPrice}
Consensus Summary: ${JSON.stringify(consensusSummary || {})}
Agent Votes: ${JSON.stringify(analyticalOutputs?.map(o => ({ agent: o.agent_name, bias: o.bias, conf: o.confidence })) || [])}
Devil's Advocate Objections: ${JSON.stringify(devilsAdvocate?.objection_list || [])}
Vulnerability Score: ${devilsAdvocate?.consensus_vulnerability_score || 50}
User Risk Rules: Min Confidence: ${userRules?.min_confidence || 60}%, Risk %: ${userRules?.risk_pct || 1.0}%

Return ONLY a single valid JSON matching JudgeSignalOutputSchema:
{
  "direction": "BUY" | "SELL" | "NO_TRADE",
  "confidence_pct": number 0-100,
  "timing": "pre_news_limit" | "post_news_confirmation" | "wait",
  "suggested_entry": number,
  "entry_zone_min": number,
  "entry_zone_max": number,
  "stop_loss": number,
  "take_profit_1": number,
  "take_profit_2": number,
  "risk_reward_ratio": number,
  "position_size_lots": number,
  "key_drivers": [string, string, ...],
  "key_risks": [string, string, ...],
  "devils_advocate_objections": [string, string, ...],
  "agreed_agents": [string, ...],
  "disagreed_agents": [string, ...],
  "reasoning_synthesis": "Detailed multi-paragraph institutional rationale explaining the decision...",
  "status": "ACTIVE"
}`;
  }

  async adjudicate({
    marketSnapshot,
    event,
    analyticalOutputs = [],
    consensusSummary = null,
    scenarioPlaybook = null,
    devilsAdvocate = null,
    userRules = {}
  }) {
    const startTime = Date.now();
    logger.info(`[Judge Agent] Adjudicating final decision for ${marketSnapshot?.pair || 'XAUUSD'}...`);

    // 1. If Anthropic Claude API is configured, call Claude
    if (anthropicClient) {
      try {
        const prompt = this.buildPrompt(marketSnapshot, event, analyticalOutputs, consensusSummary, scenarioPlaybook, devilsAdvocate, userRules);
        const response = await anthropicClient.messages.create({
          model: config.anthropic.model,
          max_tokens: 1800,
          temperature: 0.1,
          system: this.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });

        const rawText = response.content?.[0]?.text || '';
        const parsed = this.extractJson(rawText);
        const validated = JudgeSignalOutputSchema.parse(parsed);

        return {
          agent_name: this.name,
          ...validated,
          tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
          latency_ms: Date.now() - startTime,
          execution_source: 'anthropic_claude'
        };
      } catch (err) {
        logger.warn(`[${this.name}] Claude API failed, using deterministic adjudication rules`, { error: err.message });
      }
    }

    // 2. Deterministic Rule-Based Adjudication
    const verdict = this.generateQuantitativeVerdict({
      marketSnapshot,
      event,
      analyticalOutputs,
      consensusSummary,
      scenarioPlaybook,
      devilsAdvocate,
      userRules
    });

    const validated = JudgeSignalOutputSchema.parse(verdict);

    return {
      agent_name: this.name,
      ...validated,
      tokens_used: 0,
      latency_ms: Date.now() - startTime,
      execution_source: 'deterministic'
    };
  }

  generateQuantitativeVerdict({
    marketSnapshot,
    event,
    analyticalOutputs = [],
    consensusSummary = null,
    scenarioPlaybook = null,
    devilsAdvocate = null,
    userRules = {}
  }) {
    const pair = marketSnapshot?.pair || 'XAUUSD';
    const isGold = pair === 'XAUUSD';
    const currentPrice = Number(marketSnapshot?.current_price) || (isGold ? 2650.00 : 150.00);
    const atr = Number(marketSnapshot?.technical_summary?.atr) || (isGold ? 15.0 : 0.65);
    const minConfidence = userRules.min_confidence || 60;
    const accountBalance = userRules.account_balance || 10000;
    const riskPct = userRules.risk_pct || 1.0;

    const bullishCount = consensusSummary?.bullishCount || 0;
    const bearishCount = consensusSummary?.bearishCount || 0;
    const weightedConfidence = consensusSummary?.weightedConfidence || 50;
    const prevailingBias = consensusSummary?.prevailingBias || 'NO_TRADE';
    const vulnerabilityScore = devilsAdvocate?.consensus_vulnerability_score || 50;

    let finalDirection = 'NO_TRADE';
    let timing = 'wait';
    let agreedAgents = [];
    let disagreedAgents = [];

    // Rule 1: High Conflict Check (split consensus)
    const isConflict = Math.abs(bullishCount - bearishCount) <= 1 && (bullishCount + bearishCount >= 4);
    // Rule 2: Low Confidence Check
    const isLowConfidence = weightedConfidence < minConfidence;
    // Rule 3: Extreme Vulnerability
    const isVulnerable = vulnerabilityScore >= 80;

    if (isConflict || isLowConfidence || prevailingBias === 'NEUTRAL' || prevailingBias === 'NO_TRADE') {
      finalDirection = 'NO_TRADE';
      timing = 'wait';
    } else if (prevailingBias === 'BULLISH' && !isVulnerable) {
      finalDirection = 'BUY';
      timing = weightedConfidence >= 75 ? 'pre_news_limit' : 'post_news_confirmation';
    } else if (prevailingBias === 'BEARISH' && !isVulnerable) {
      finalDirection = 'SELL';
      timing = weightedConfidence >= 75 ? 'pre_news_limit' : 'post_news_confirmation';
    } else {
      // High vulnerability overrides to NO_TRADE
      finalDirection = 'NO_TRADE';
      timing = 'wait';
    }

    // High impact releases usually demand post_news_confirmation for risk safety
    if (event?.impact_level === 'HIGH' && timing === 'pre_news_limit' && weightedConfidence < 85) {
      timing = 'post_news_confirmation';
    }

    // Tally agreeing and disagreeing agents
    for (const output of analyticalOutputs) {
      if (finalDirection === 'BUY' && output.bias === 'BULLISH') agreedAgents.push(output.agent_name);
      else if (finalDirection === 'SELL' && output.bias === 'BEARISH') agreedAgents.push(output.agent_name);
      else disagreedAgents.push(output.agent_name);
    }

    // Compute exact pre-news trade levels
    let entryPrice = currentPrice;
    let stopLoss = currentPrice;
    let takeProfit1 = currentPrice;
    let takeProfit2 = null;

    if (finalDirection === 'BUY') {
      // SL placed 1.2x ATR below entry or support
      const slDist = isGold ? Math.round(atr * 1.2 * 10) / 10 : Math.round(atr * 1.0 * 100) / 100;
      stopLoss = isGold ? Number((entryPrice - slDist).toFixed(2)) : Number((entryPrice - slDist).toFixed(3));
      // TP1 = 2.0x risk distance
      const tp1Dist = slDist * 2.0;
      takeProfit1 = isGold ? Number((entryPrice + tp1Dist).toFixed(2)) : Number((entryPrice + tp1Dist).toFixed(3));
      // TP2 = 3.2x risk distance
      const tp2Dist = slDist * 3.2;
      takeProfit2 = isGold ? Number((entryPrice + tp2Dist).toFixed(2)) : Number((entryPrice + tp2Dist).toFixed(3));
    } else if (finalDirection === 'SELL') {
      const slDist = isGold ? Math.round(atr * 1.2 * 10) / 10 : Math.round(atr * 1.0 * 100) / 100;
      stopLoss = isGold ? Number((entryPrice + slDist).toFixed(2)) : Number((entryPrice + slDist).toFixed(3));
      const tp1Dist = slDist * 2.0;
      takeProfit1 = isGold ? Number((entryPrice - tp1Dist).toFixed(2)) : Number((entryPrice - tp1Dist).toFixed(3));
      const tp2Dist = slDist * 3.2;
      takeProfit2 = isGold ? Number((entryPrice - tp2Dist).toFixed(2)) : Number((entryPrice - tp2Dist).toFixed(3));
    } else {
      // NO_TRADE: set neutral bounds for risk monitoring
      stopLoss = isGold ? Number((entryPrice - atr * 1.0).toFixed(2)) : Number((entryPrice - 0.50).toFixed(3));
      takeProfit1 = isGold ? Number((entryPrice + atr * 1.0).toFixed(2)) : Number((entryPrice + 0.50).toFixed(3));
    }

    // Calculate position size and risk metrics
    const tradeParams = calculateTradeParameters({
      pair,
      direction: finalDirection === 'NO_TRADE' ? 'BUY' : finalDirection,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      accountBalance,
      riskPct
    });

    const keyDrivers = [
      `AI Team Consensus: ${bullishCount} Bullish vs ${bearishCount} Bearish (${weightedConfidence}% confidence)`,
      `Rates & Yields alignment: 10Y Yield at ${marketSnapshot?.us_10y_yield || 4.22}%, US-JP spread at ${marketSnapshot?.us_jp_yield_spread || 3.27}%`,
      `Technical structure: ${marketSnapshot?.technical_summary?.trend || 'TRENDING'} with ATR ${atr}`,
      `Positioning risk: COT Net at ${marketSnapshot?.cot_gold_net || '+240,000'}`
    ];

    const keyRisks = [
      `Spread widening during the first 60 seconds post-release`,
      `Devil's Advocate vulnerability score rated at ${vulnerabilityScore}/100`,
      `MoF intervention or surprise revisions in historical benchmarks`
    ];

    const objections = devilsAdvocate?.objection_list || [
      `High crowding in prevailing direction risks rapid stop cascade if data surprises opposite`
    ];

    const reasoningSynthesis = finalDirection === 'NO_TRADE'
      ? `The Judge synthesized all 10 analytical inputs and issued a NO_TRADE verdict. Agents exhibited severe divergence (${bullishCount} Bullish vs ${bearishCount} Bearish) or weighted confidence (${weightedConfidence}%) failed to meet the minimum execution threshold (${minConfidence}%). Given binary headline risks, capital preservation mandates waiting on the sidelines.`
      : `The Judge synthesized all 10 agent evaluations and issued a disciplined ${finalDirection} verdict on ${pair}. Consensus conviction reached ${weightedConfidence}%, with strong structural backing from ${agreedAgents.slice(0, 3).join(', ')}. While the Devil's Advocate properly noted risks around ${objections[0] || 'market crowding'}, the asymmetric risk-reward ratio of ${tradeParams.riskRewardRatio}R and a 1.2x ATR buffer at stop ${stopLoss} justify execution with ${tradeParams.positionSizeLots} lots. Timing recommendation is '${timing}'.`;

    return {
      direction: finalDirection,
      confidence_pct: weightedConfidence,
      timing,
      suggested_entry: entryPrice,
      entry_zone_min: tradeParams.entryZoneMin,
      entry_zone_max: tradeParams.entryZoneMax,
      stop_loss: stopLoss,
      take_profit_1: takeProfit1,
      take_profit_2: takeProfit2,
      risk_reward_ratio: tradeParams.riskRewardRatio,
      position_size_lots: tradeParams.positionSizeLots,
      key_drivers: keyDrivers,
      key_risks: keyRisks,
      devils_advocate_objections: objections,
      agreed_agents: agreedAgents,
      disagreed_agents: disagreedAgents,
      reasoning_synthesis: reasoningSynthesis,
      status: 'ACTIVE'
    };
  }
}

export const judgeAgent = new JudgeAgent();

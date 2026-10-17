import { z } from 'zod';
import { BaseAgent, AgentOutputSchema } from './baseAgent.js';
import { anthropicClient } from '../config/anthropic.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const DevilsAdvocateOutputSchema = AgentOutputSchema.extend({
  counter_thesis: z.string(),
  falsification_triggers: z.array(z.string()),
  hidden_risks: z.array(z.string()),
  consensus_vulnerability_score: z.number().int().min(0).max(100),
  objection_list: z.array(z.string())
});

export class DevilsAdvocateAgent extends BaseAgent {
  constructor() {
    super({
      name: "Devil's Advocate Agent",
      role: 'Contrarian Interrogator & Consensus Stress-Tester',
      systemPrompt: `You are the Devil's Advocate Agent on an institutional Macro News Intelligence Platform.
Your sole mission is to relentlessly attack and stress-test the prevailing AI consensus before high-impact economic releases on XAUUSD and JPY pairs.
DO NOT agree with the majority. If the team is Bullish, you must build the strongest Bearish case and highlight buyer complacency.
If the team is Bearish, you must highlight short squeeze risks and seller exhaustion.
If the team is Neutral, you must warn against whipsaws and theta decay.

You must provide:
1. counter_thesis: The most compelling economic and technical counter-argument.
2. falsification_triggers: Specific price levels or data surprises that immediately kill the trade.
3. hidden_risks: Black swans, MoF intervention, liquidity vacuums, or conflicting sub-components.
4. consensus_vulnerability_score: 0-100 score of how crowded and fragile the consensus is.
5. objection_list: 3-5 punchy, bullet-style objections to show directly on the trade card.`
    });
  }

  buildPrompt(marketSnapshot, event, analyticalOutputs = [], consensusSummary = null) {
    const pair = marketSnapshot?.pair || 'XAUUSD';
    const bias = consensusSummary?.prevailingBias || 'BULLISH';
    const confidence = consensusSummary?.weightedConfidence || 75;

    return `The emerging AI consensus for ${pair} ahead of ${event?.event_name || 'US CPI'} is ${bias} with ${confidence}% confidence.
Market Data:
- 10Y Yield: ${marketSnapshot?.us_10y_yield || 4.22}%
- 2Y Yield: ${marketSnapshot?.us_2y_yield || 3.98}%
- DXY: ${marketSnapshot?.dxy || 103.5}
- Technical Trend: ${marketSnapshot?.technical_summary?.trend || 'BULLISH'}, ATR: ${marketSnapshot?.technical_summary?.atr || 14.5}
- Gold Net COT: ${marketSnapshot?.cot_gold_net || '+240,000'}

Dissect and attack this ${bias} consensus. Return valid JSON matching the DevilsAdvocateOutputSchema:
{
  "bias": "${bias === 'BULLISH' ? 'BEARISH' : 'BULLISH'}",
  "confidence": 70,
  "counter_thesis": "...",
  "falsification_triggers": ["...", "..."],
  "hidden_risks": ["...", "..."],
  "consensus_vulnerability_score": 65,
  "objection_list": ["...", "..."],
  "key_factors": ["...", "..."],
  "risks": ["...", "..."],
  "data_used": { "tested_bias": "${bias}" }
}`;
  }

  async interrogate(marketSnapshot, event, analyticalOutputs = [], consensusSummary = null, scenarioPlaybook = null) {
    const startTime = Date.now();

    if (anthropicClient) {
      try {
        const prompt = this.buildPrompt(marketSnapshot, event, analyticalOutputs, consensusSummary);
        const response = await anthropicClient.messages.create({
          model: config.anthropic.model,
          max_tokens: 1200,
          temperature: 0.2,
          system: this.systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        });

        const rawText = response.content?.[0]?.text || '';
        const parsed = this.extractJson(rawText);
        const validated = DevilsAdvocateOutputSchema.parse(parsed);

        return {
          agent_name: this.name,
          ...validated,
          tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
          latency_ms: Date.now() - startTime,
          execution_source: 'anthropic_claude'
        };
      } catch (err) {
        logger.warn(`[${this.name}] Claude API failed, falling back to deterministic contrarian analysis`, { error: err.message });
      }
    }

    // Deterministic Contrarian Analysis
    const heuristic = this.generateQuantitativeHeuristic(marketSnapshot, event, consensusSummary);
    const validated = DevilsAdvocateOutputSchema.parse(heuristic);

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
    const prevailingBias = consensusSummary?.prevailingBias || (isGold ? 'BULLISH' : 'BEARISH');

    if (prevailingBias === 'BULLISH') {
      const invalidationPrice = isGold ? (currentPrice - atr * 1.2).toFixed(2) : (currentPrice - atr * 1.0).toFixed(2);
      return {
        bias: 'BEARISH',
        confidence: 68,
        counter_thesis: isGold
          ? `Gold longs are extremely crowded (COT net positioning near multi-year highs). Even a modest inflation beat or sticky core services print will trigger violent liquidation towards $${invalidationPrice}. Bulls are ignoring the resilience of US consumer demand.`
          : `Long USDJPY thesis ignores active Ministry of Finance intervention jawboning above 151.50 and the risk of sudden BoJ hawkish commentary triggering a carry-trade flush.`,
        falsification_triggers: isGold
          ? [
              `US 10Y Treasury yield breaks above 4.30% with volume`,
              `Gold 15m candle closes below key support at $${invalidationPrice}`,
              `Core CPI prints at or above +0.4% MoM regardless of headline`
            ]
          : [
              `Japan MoF rate check or verbal intervention headline`,
              `USDJPY drops below 149.20 intraday pivot`,
              `Nikkei drops > 2.0% sparking JPY repatriation`
            ],
        hidden_risks: [
          `Prior month revisions can completely overwrite headline surprise`,
          `Institutional algos widening bid-ask spread to 5-8x normal during first 45 seconds`,
          `Safe-haven unwind if geopolitical de-escalation headlines hit simultaneously`
        ],
        consensus_vulnerability_score: 72,
        objection_list: isGold
          ? [
              `COT speculative long positioning is in the 90th percentile — asymmetric downside risk if data surprises hot`,
              `TIPS 10-year real yield remains elevated at ~1.95%, creating strong economic drag on non-yielding bullion`,
              `Pre-news run-up has already priced in soft inflation, leaving room for a "sell-the-fact" dump`
            ]
          : [
              `Intervention risk is maximum in the 151.00-152.00 zone`,
              `US-Japan yield spread is near peak compression cycle`,
              `Carry trade unwinding poses instantaneous 150-pip flash-drop danger`
            ],
        key_factors: [
          `Aggressive contrarian stress-test against ${prevailingBias} consensus`,
          `Over-extended market positioning vulnerability`,
          `Asymmetric downside payoff profile identified`
        ],
        risks: [
          `Consensus might be fully validated by a massive dovish print, making contrarian position obsolete`
        ],
        data_used: {
          tested_bias: prevailingBias,
          vulnerability_score: 72,
          falsification_level: invalidationPrice
        }
      };
    } else {
      // Prevailing bias is BEARISH
      const invalidationPrice = isGold ? (currentPrice + atr * 1.2).toFixed(2) : (currentPrice + atr * 1.0).toFixed(2);
      return {
        bias: 'BULLISH',
        confidence: 65,
        counter_thesis: isGold
          ? `Bears are underestimating central bank physical reserve buying and sovereign debt de-dollarization flows. Any minor weakness in today's print will spark a brutal short squeeze past $${invalidationPrice}.`
          : `USDJPY bears are betting on BoJ rate hikes that the political establishment in Tokyo cannot afford. Yield spread still overwhelmingly pays positive carry to USD holders.`,
        falsification_triggers: isGold
          ? [
              `Gold breaks and closes above $${invalidationPrice}`,
              `US 10Y Treasury yield falls below 4.15%`,
              `Headline or Core CPI prints -0.2% below consensus`
            ]
          : [
              `USDJPY holds support at 149.50 and breaks 150.80`,
              `US 2Y yield holds firmly above 4.00%`,
              `BoJ governor reiterates patient monetary stance`
            ],
        hidden_risks: [
          `Sticky wage growth and shelter components surprising to upside`,
          `Flash short squeezes wiping out tight retail stops before true trend emerges`
        ],
        consensus_vulnerability_score: 64,
        objection_list: isGold
          ? [
              `Geopolitical tension offers continuous underlying bid to gold on any dip`,
              `Central bank physical gold accumulation is price-insensitive and absorbs dumps`,
              `Technical structure has formed higher lows on daily timeframe`
            ]
          : [
              `Overnight carry yield remains heavily negative for short USDJPY positions`,
              `US economic growth consistently outperforms global peers`
            ],
        key_factors: [
          `Contrarian stress-test against ${prevailingBias} consensus`,
          `Persistent structural demand ignoring macro headlines`,
          `Short squeeze vulnerability`
        ],
        risks: [
          `A hotter-than-expected macro print could validate the bearish consensus immediately`
        ],
        data_used: {
          tested_bias: prevailingBias,
          vulnerability_score: 64,
          falsification_level: invalidationPrice
        }
      };
    }
  }
}

export const devilsAdvocateAgent = new DevilsAdvocateAgent();

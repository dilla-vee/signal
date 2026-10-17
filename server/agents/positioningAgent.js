import { BaseAgent } from './baseAgent.js';

export class PositioningAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Positioning & Sentiment Agent',
      role: 'CFTC Commitments of Traders (COT) positioning, institutional crowding, and retail sentiment extremes',
      systemPrompt: `You are the Positioning & Sentiment Specialist.
Analyze:
1. CFTC COT Non-Commercial Net Positions for Gold and Japanese Yen.
2. Crowding & Exhaustion: When net long/short positions reach historical extremes (> 2.5 standard deviations), the market is vulnerable to violent squeezes against the crowded consensus.
3. Retail sentiment skew and headline euphoria/panic.
Extreme Long Crowding = Contrarian Caution / Vulnerable to flush. Heavy Short Crowding = Squeeze Potential.`
    });
  }

  generateQuantitativeHeuristic(snapshot, event) {
    const pair = snapshot.pair || 'XAUUSD';
    const isGold = pair.toUpperCase() === 'XAUUSD';
    const isJpy = pair.toUpperCase().endsWith('JPY');

    const cotGold = snapshot.cot_gold_net || 265400;
    const cotJpy = snapshot.cot_jpy_net || -42100;

    let bias = 'NEUTRAL';
    let confidence = 68;
    const keyFactors = [];
    const risks = [];

    if (isGold) {
      if (cotGold > 250000) {
        // High net long positioning
        bias = 'BULLISH';
        confidence = 70;
        keyFactors.push(`CFTC Non-Commercial Net Long positioning at ${Number(cotGold).toLocaleString()} contracts confirms powerful institutional participation.`);
        keyFactors.push('Sustained hedge fund accumulation demonstrates deep macro conviction.');
        risks.push('Crowded long positioning introduces vulnerability to long liquidation cascades on any hot US inflation surprise.');
      } else {
        bias = 'NEUTRAL';
        confidence = 62;
        keyFactors.push(`COT net positioning (${Number(cotGold).toLocaleString()}) remains in balanced neutral band.`);
        risks.push('Lack of aggressive institutional backing limits momentum extension.');
      }
    } else if (isJpy) {
      if (cotJpy < -100000) {
        // Extreme Yen short crowding = Squeeze risk for USDJPY downside
        bias = 'BEARISH'; // Bearish USDJPY = Yen strength
        confidence = 76;
        keyFactors.push(`Extreme JPY net short positioning (${Number(cotJpy).toLocaleString()}) indicates overcrowded carry trade, primed for an explosive short squeeze.`);
        risks.push('Persistent carry yield buyers may absorb initial squeeze attempts.');
      } else {
        bias = 'NEUTRAL';
        confidence = 65;
        keyFactors.push(`JPY net positioning has normalized to ${Number(cotJpy).toLocaleString()} contracts following recent unwind phases.`);
        risks.push('Shifts in retail speculative sentiment.');
      }
    }

    return {
      bias,
      confidence,
      key_factors: keyFactors,
      risks,
      data_used: {
        cot_gold_net: cotGold,
        cot_jpy_net: cotJpy,
        pair
      }
    };
  }
}

export const positioningAgent = new PositioningAgent();

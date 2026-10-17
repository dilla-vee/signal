import { BaseAgent } from './baseAgent.js';

export class GeopoliticalAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Geopolitical & Event-Risk Agent',
      role: 'Global safe-haven demand premiums, Japan MoF intervention boundary alerts, and geopolitical tail risks',
      systemPrompt: `You are the Geopolitical & Sovereign Event-Risk Specialist.
Analyze:
1. Safe-haven physical demand and geopolitical risk premia for Spot Gold (XAUUSD).
2. Japanese Ministry of Finance (MoF) and BoJ currency intervention risk (active threshold historically 151.00 - 152.50 on USDJPY).
3. Tail-risk scenarios (Middle East conflicts, sovereign debt alarms, trade tariff escalations).
When USDJPY approaches 151.00+, MoF intervention risk is EXTREME (high probability of abrupt 300-500 pip intervention drop).
Geopolitical escalation = Strongly Bullish Gold.`
    });
  }

  generateQuantitativeHeuristic(snapshot, event) {
    const pair = snapshot.pair || 'XAUUSD';
    const isGold = pair.toUpperCase() === 'XAUUSD';
    const isUsdJpy = pair.toUpperCase() === 'USDJPY';
    const isJpyCross = pair.toUpperCase().endsWith('JPY');

    const cb = snapshot.central_bank_tone || {};
    const mofRisk = cb.mof_intervention_risk || 'MODERATE_HIGH';
    const currentPrice = snapshot.technical_summary?.currentPrice || (isGold ? 2658.40 : 149.85);

    let bias = 'NEUTRAL';
    let confidence = 75;
    const keyFactors = [];
    const risks = [];

    if (isGold) {
      bias = 'BULLISH';
      confidence = 80;
      keyFactors.push('Ongoing geopolitical conflicts in the Middle East and Eastern Europe sustain a structural $40-$60/oz safe-haven premium in Spot Gold.');
      keyFactors.push('Central bank physical gold reserve diversification (PBoC and emerging sovereigns) sets a durable institutional floor under pullbacks.');
      risks.push('Any sudden diplomatic breakthrough or ceasefire announcement could deflate the geopolitical risk premium by $30-$50 within hours.');
    } else if (isUsdJpy || isJpyCross) {
      if (currentPrice >= 149.50) {
        bias = 'BEARISH'; // Bearish USDJPY = Yen strength on intervention threat
        confidence = 78;
        keyFactors.push(`USDJPY at ${currentPrice} is operating directly inside the Japanese Ministry of Finance (MoF) verbal and physical intervention strike zone (150.00-152.00).`);
        keyFactors.push('Top currency diplomat (Vice Finance Minister) warnings indicate bank rate checks may precede direct spot market intervention.');
        risks.push('Failure of MoF to intervene on a break above 151.50 could trigger a rapid speculative stop run toward 153.00.');
      } else {
        bias = 'NEUTRAL';
        confidence = 65;
        keyFactors.push(`USDJPY at ${currentPrice} sits below urgent intervention triggers, leaving price action driven by US yields.`);
        risks.push('Sudden spike in oil prices degrading Japan’s trade balance.');
      }
    }

    return {
      bias,
      confidence,
      key_factors: keyFactors,
      risks,
      data_used: {
        mof_intervention_risk: mofRisk,
        current_price: currentPrice,
        pair
      }
    };
  }
}

export const geopoliticalAgent = new GeopoliticalAgent();

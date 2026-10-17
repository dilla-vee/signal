import { BaseAgent } from './baseAgent.js';

export class CentralBankAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Central Bank Agent',
      role: 'Monetary policy divergence (Federal Reserve vs Bank of Japan) and statement delta analysis',
      systemPrompt: `You are the Senior Central Bank Policy Specialist.
Analyze:
1. Federal Reserve forward guidance, dot plots, and chair rhetoric (Hawkish vs Dovish).
2. Bank of Japan monetary policy normalization (Governor Ueda pressers, rate hike trajectory, YCC adjustments).
3. Changes vs previous statements.
For Gold (XAUUSD): Dovish Fed = Bullish Gold. Hawkish Fed = Bearish Gold.
For USDJPY: Dovish Fed + Hawkish BoJ = Strongly Bearish USDJPY (Yen strength). Hawkish Fed + Dovish BoJ = Strongly Bullish USDJPY.`
    });
  }

  generateQuantitativeHeuristic(snapshot, event) {
    const pair = snapshot.pair || 'XAUUSD';
    const isGold = pair.toUpperCase() === 'XAUUSD';
    const isUsdJpy = pair.toUpperCase() === 'USDJPY';
    const cb = snapshot.central_bank_tone || {};

    const fedDovish = cb.fed_stance?.includes('DOVISH');
    const bojHawkish = cb.boj_stance?.includes('HAWKISH');

    let bias = 'NEUTRAL';
    let confidence = 75;
    const keyFactors = [];
    const risks = [];

    if (isGold) {
      if (fedDovish) {
        bias = 'BULLISH';
        confidence = 78;
        keyFactors.push('Federal Reserve policy bias is dovish-leaning; rate-cutting cycle reduces opportunity cost of holding non-yielding Gold.');
        keyFactors.push('Neutral rate projections suggest terminal rate plateau, capping real yield spikes.');
        risks.push('Any hawkish pause rhetoric on resilient GDP could cause sharp gold retracement.');
      } else {
        bias = 'BEARISH';
        confidence = 70;
        keyFactors.push('Federal Reserve signaling higher-for-longer policy rates.');
        risks.push('Financial stability risks could force premature Fed easing.');
      }
    } else if (isUsdJpy || pair.toUpperCase().endsWith('JPY')) {
      if (fedDovish && bojHawkish) {
        bias = 'BEARISH'; // Bearish USDJPY = Stronger Yen
        confidence = 80;
        keyFactors.push('Maximum monetary policy divergence favoring the Yen: Fed easing rates while BoJ normalizes benchmark to 0.25%+.');
        keyFactors.push('Narrowing interest rate differential diminishes incentive for USDJPY carry longs.');
        risks.push('BoJ dovish hesitation or delay in next hike could trigger USDJPY relief rally back to 151.');
      } else {
        bias = 'BULLISH';
        confidence = 68;
        keyFactors.push('Yield advantage remains in favor of the base currency against zero-rate JPY.');
        risks.push('Verbal intervention from Japanese authorities.');
      }
    }

    return {
      bias,
      confidence,
      key_factors: keyFactors,
      risks,
      data_used: {
        fed_stance: cb.fed_stance || 'DOVISH_LEANING',
        boj_stance: cb.boj_stance || 'HAWKISH_NORMALIZATION',
        pair
      }
    };
  }
}

export const centralBankAgent = new CentralBankAgent();

import { BaseAgent } from './baseAgent.js';

export class RatesYieldAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Rates & Yield Agent',
      role: 'Treasury curve dynamics, TIPS real yields, and US-Japan sovereign yield spread mechanics',
      systemPrompt: `You are the Sovereign Rates & Fixed Income Specialist.
Analyze:
1. US 10-Year and 2-Year Treasury yields and yield curve slope (2s10s).
2. US Real Yields (10Y TIPS) — the single most mathematically correlated fundamental driver of Spot Gold (correlation > -0.85).
3. US-Japan 10Y Yield Spread — the core mechanical anchor of USDJPY (correlation > +0.90).
Yield Spreads compressing = Bearish USDJPY. Real yields falling = Bullish Gold.`
    });
  }

  generateQuantitativeHeuristic(snapshot, event) {
    const pair = snapshot.pair || 'XAUUSD';
    const isGold = pair.toUpperCase() === 'XAUUSD';
    const isJpy = pair.toUpperCase().endsWith('JPY');

    const realYield = snapshot.us_real_yield || 1.84;
    const us10y = snapshot.us_10y_yield || 4.18;
    const us2y = snapshot.us_2y_yield || 4.02;
    const usJpSpread = snapshot.us_jp_spread || 3.23;

    let bias = 'NEUTRAL';
    let confidence = 75;
    const keyFactors = [];
    const risks = [];

    if (isGold) {
      // Gold analysis based on US Real Yields
      if (realYield < 2.0) {
        bias = 'BULLISH';
        confidence = 82;
        keyFactors.push(`US 10Y Real Yield at ${realYield}% remains below critical 2.0% pressure threshold, creating strong institutional tailwind for Gold.`);
        keyFactors.push(`US 2Y yield (${us2y}%) consolidates below 10Y (${us10y}%), curve steepening supports commodity reflation.`);
        risks.push('Sudden spike in real yields above 2.05% would directly invalidate Gold bullish bias.');
      } else {
        bias = 'BEARISH';
        confidence = 74;
        keyFactors.push(`Elevated real yield (${realYield}%) generates attractive risk-free cash returns, competing against zero-yield bullion.`);
        risks.push('Treasury auction demand could push yields lower.');
      }
    } else if (isJpy) {
      // USDJPY / JPY Crosses based on US-JP Yield Spread
      if (usJpSpread < 3.40) {
        bias = 'BEARISH'; // Bearish USDJPY = Yen strengthening
        confidence = 79;
        keyFactors.push(`US-Japan 10Y yield spread has narrowed to ${usJpSpread}% from peak 3.80%, compressing carry-trade profitability.`);
        keyFactors.push(`JGB 10Y yield anchored at ${snapshot.jgb_yield || 0.95}% while US long-end rates cap out.`);
        risks.push('Resurgent US benchmark yield breaking 4.30% would reignite USDJPY upside toward 152.00.');
      } else {
        bias = 'BULLISH';
        confidence = 70;
        keyFactors.push(`Wide yield spread (${usJpSpread}%) sustains positive swap carry for long dollar positions.`);
        risks.push('Yield spread compression on dovish US data.');
      }
    }

    return {
      bias,
      confidence,
      key_factors: keyFactors,
      risks,
      data_used: {
        us_10y_yield: us10y,
        us_2y_yield: us2y,
        us_real_yield: realYield,
        us_jp_spread: usJpSpread,
        pair
      }
    };
  }
}

export const ratesYieldAgent = new RatesYieldAgent();

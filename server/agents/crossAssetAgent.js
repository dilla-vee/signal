import { BaseAgent } from './baseAgent.js';

export class CrossAssetAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Cross-Asset & Risk-Sentiment Agent',
      role: 'Cross-market contagion, Dollar Index (DXY), equity beta, VIX risk appetite, and carry-trade unwind conditions',
      systemPrompt: `You are the Cross-Asset & Risk-Sentiment Specialist.
Analyze:
1. US Dollar Index (DXY) trend and strength.
2. Global Equity risk appetite (S&P 500, Nasdaq 100).
3. CBOE Volatility Index (VIX) — VIX spike (> 20) triggers violent JPY carry-trade unwinds across USDJPY, EURJPY, GBPJPY, AUDJPY.
4. Energy & Oil (WTI) — higher oil fuels headline inflation fears.
Rising VIX / equity selloff = Bullish JPY (Risk-off unwinds JPY crosses) and Bullish Gold (Safe haven).
Strong DXY = Headwind for Gold and EURJPY.`
    });
  }

  generateQuantitativeHeuristic(snapshot, event) {
    const pair = snapshot.pair || 'XAUUSD';
    const isGold = pair.toUpperCase() === 'XAUUSD';
    const isJpyCross = ['EURJPY', 'GBPJPY', 'AUDJPY'].includes(pair.toUpperCase());

    const vix = snapshot.vix || 16.40;
    const dxy = snapshot.dxy || 102.85;
    const oil = snapshot.oil_wti || 71.20;

    let bias = 'NEUTRAL';
    let confidence = 70;
    const keyFactors = [];
    const risks = [];

    if (vix > 20.0) {
      // Risk-off regime
      if (isGold) {
        bias = 'BULLISH';
        confidence = 78;
        keyFactors.push(`Elevated VIX (${vix}) signals institutional risk-aversion, accelerating safe-haven allocations into Gold.`);
      } else if (isJpyCross) {
        bias = 'BEARISH';
        confidence = 82;
        keyFactors.push(`High equity volatility triggers swift carry-trade liquidations, driving heavy downside across ${pair}.`);
      } else {
        bias = 'BEARISH'; // USDJPY falls on JPY repatriation
        confidence = 74;
        keyFactors.push('Global risk-off flow spurs Japanese domestic capital repatriation.');
      }
      risks.push('VIX crush / rapid equity rebound could prompt immediate short squeeze.');
    } else {
      // Stable risk environment
      if (isGold) {
        bias = dxy < 103.5 ? 'BULLISH' : 'NEUTRAL';
        confidence = 68;
        keyFactors.push(`Moderate DXY (${dxy}) and stable VIX (${vix}) allow Gold to trade on structural macro themes.`);
        risks.push(`Oil price volatility ($${oil}/bbl) could alter consumer expectations.`);
      } else if (isJpyCross) {
        bias = 'NEUTRAL';
        confidence = 65;
        keyFactors.push(`Sub-20 VIX (${vix}) supports stable carry-trade financing, keeping downside in ${pair} orderly.`);
        risks.push('Any sudden shock in equity futures leading into the event.');
      } else {
        bias = 'NEUTRAL';
        confidence = 64;
        keyFactors.push('Balanced cross-asset backdrop provides neither dominant tailwind nor headwind.');
        risks.push('Abrupt USD momentum shift post-release.');
      }
    }

    return {
      bias,
      confidence,
      key_factors: keyFactors,
      risks,
      data_used: {
        dxy,
        vix,
        oil_wti: oil,
        spx: snapshot.spx || 5815.20,
        pair
      }
    };
  }
}

export const crossAssetAgent = new CrossAssetAgent();

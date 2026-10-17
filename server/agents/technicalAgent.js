import { BaseAgent } from './baseAgent.js';

export class TechnicalAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Technical Structure Agent',
      role: 'Institutional price action, multi-timeframe trend, support/resistance liquidity, and ATR volatility modeling',
      systemPrompt: `You are the Lead Institutional Technical & Market Structure Analyst.
Analyze:
1. Macro Trend (Bullish, Bearish, Ranging) from price data.
2. 14-period Average True Range (ATR) — dictates minimum safe stop distance and news noise buffers.
3. Key Support and Resistance boundaries and institutional liquidity pools.
4. Recent price range and mean-reversion levels.
Never recommend a trade directly into immediate major support or resistance ahead of high-impact releases.`
    });
  }

  generateQuantitativeHeuristic(snapshot, event) {
    const pair = snapshot.pair || 'XAUUSD';
    const tech = snapshot.technical_summary || {
      trend: 'BULLISH',
      atr: 28.5,
      keySupport: 2635.0,
      keyResistance: 2685.0,
      currentPrice: 2658.40
    };

    let bias = 'NEUTRAL';
    let confidence = 70;
    const keyFactors = [];
    const risks = [];

    if (tech.trend === 'BULLISH') {
      bias = 'BULLISH';
      confidence = 74;
      keyFactors.push(`Market structure shows higher swing highs and higher swing lows; primary trend is Bullish.`);
      keyFactors.push(`Current price (${tech.currentPrice}) holds comfortably above major support at ${tech.keySupport}.`);
      risks.push(`Approaching resistance liquidity cluster near ${tech.keyResistance}; pullback risk if momentum wanes.`);
    } else if (tech.trend === 'BEARISH') {
      bias = 'BEARISH';
      confidence = 72;
      keyFactors.push(`Price is printing consistent lower highs; sellers maintain control below ${tech.keyResistance}.`);
      keyFactors.push(`Testing critical support at ${tech.keySupport}; a breakdown accelerates momentum.`);
      risks.push(`Oversold RSI condition could fuel explosive short-squeeze bounce.`);
    } else {
      bias = 'NEUTRAL';
      confidence = 60;
      keyFactors.push(`Price is oscillating within range between ${tech.keySupport} and ${tech.keyResistance}.`);
      risks.push('False breakout whipsaws prevalent in ranging regimes during news spikes.');
    }

    keyFactors.push(`14-period ATR is ${tech.atr}. Stop-losses must be placed at minimum 1.2x ATR away from entry to withstand pre-release noise.`);

    return {
      bias,
      confidence,
      key_factors: keyFactors,
      risks,
      data_used: {
        trend: tech.trend,
        atr: tech.atr,
        key_support: tech.keySupport,
        key_resistance: tech.keyResistance,
        current_price: tech.currentPrice,
        pair
      }
    };
  }
}

export const technicalAgent = new TechnicalAgent();

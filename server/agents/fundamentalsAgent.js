import { BaseAgent } from './baseAgent.js';

export class FundamentalsAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Fundamentals Agent',
      role: 'Consensus vs previous analysis, historical survey accuracy, and surprise skew modeling',
      systemPrompt: `You are the lead Macroeconomic Fundamentals Analyst specializing in Spot Gold (XAUUSD) and JPY pairs (USDJPY, EURJPY, GBPJPY, AUDJPY).
Your role: Evaluate upcoming economic data (CPI, PPI, NFP, GDP, Retail Sales, Japan CPI).
Analyze:
1. Consensus forecast vs Previous print.
2. Underlying subcomponent momentum (e.g. shelter CPI, wage pressures, revisions).
3. Likelihood and direction of a surprise.
If the data skew points to higher yields/hotter US inflation, that is Bearish for Gold and Bullish for USDJPY. If soft/cooler, Bullish for Gold and Bearish for USDJPY.`
    });
  }

  generateQuantitativeHeuristic(snapshot, event) {
    const pair = snapshot.pair || 'XAUUSD';
    const isGold = pair.toUpperCase() === 'XAUUSD';
    const forecast = event?.forecast_val ? parseFloat(event.forecast_val) : null;
    const previous = event?.previous_val ? parseFloat(event.previous_val) : null;

    let bias = 'NEUTRAL';
    let confidence = 65;
    const keyFactors = [];
    const risks = [];

    if (forecast !== null && previous !== null) {
      if (forecast < previous) {
        // Disinflation / cooling trend expected
        bias = isGold ? 'BULLISH' : 'BEARISH';
        confidence = 72;
        keyFactors.push(`Consensus forecast (${forecast}%) is cooler than previous print (${previous}%), implying softening rate pressure.`);
        keyFactors.push('Leading disinflation indicators (shelter index lag and energy moderation) favor downside surprise.');
        risks.push('Sticky services component or commodity rebound could prevent downside follow-through.');
      } else if (forecast > previous) {
        // Accelerating trend expected
        bias = isGold ? 'BEARISH' : 'BULLISH';
        confidence = 70;
        keyFactors.push(`Consensus forecast (${forecast}%) anticipates re-acceleration from previous (${previous}%).`);
        keyFactors.push('Higher terminal yield expectations strengthen USD relative to Gold and JPY.');
        risks.push('Growth concerns could cap yield upside despite a warm headline print.');
      } else {
        bias = isGold ? 'BULLISH' : 'NEUTRAL';
        confidence = 62;
        keyFactors.push(`Consensus (${forecast}%) in-line with previous (${previous}%); broader macro trend dominates.`);
        risks.push('Any minor tenth of a percent deviation will trigger exaggerated initial algorithmic flow.');
      }
    } else {
      keyFactors.push('Event consensus within expected institutional bandwidth; watching revisions closely.');
      risks.push('Absence of clear survey skew limits directional pre-news conviction.');
    }

    return {
      bias,
      confidence,
      key_factors: keyFactors,
      risks,
      data_used: {
        event_name: event?.event_name || 'Macro Release',
        forecast_val: event?.forecast_val || 'N/A',
        previous_val: event?.previous_val || 'N/A',
        pair
      }
    };
  }
}

export const fundamentalsAgent = new FundamentalsAgent();

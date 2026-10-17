/**
 * Trade calculations utility for Gold and Forex pairs
 * Computes exact pre-news entry parameters, risk-reward ratios, and lot sizing.
 */

export function calculateTradeParameters({
  pair,
  direction,
  entryPrice,
  stopLoss,
  takeProfit1,
  takeProfit2 = null,
  accountBalance = 10000,
  riskPct = 1.0
}) {
  const numEntry = Number(entryPrice);
  const numSL = Number(stopLoss);
  const numTP1 = Number(takeProfit1);
  const numTP2 = takeProfit2 ? Number(takeProfit2) : null;
  const numBalance = Number(accountBalance);
  const numRiskPct = Number(riskPct);

  // 1. Calculate risk amount in USD
  const riskAmountUsd = Math.round((numBalance * (numRiskPct / 100)) * 100) / 100;

  // 2. Risk and reward distances
  const isBuy = direction.toUpperCase() === 'BUY';
  const riskDistance = Math.abs(numEntry - numSL);
  const rewardDistance1 = isBuy ? (numTP1 - numEntry) : (numEntry - numTP1);

  // Risk reward ratio based on TP1
  const rawRR = riskDistance > 0 ? (rewardDistance1 / riskDistance) : 0;
  const riskRewardRatio = Math.round(rawRR * 100) / 100;

  // 3. Position Sizing
  // Gold (XAUUSD): 1 standard lot = 100 troy oz. $1 price move per lot = $100.
  // JPY Pairs (USDJPY, EURJPY, GBPJPY, AUDJPY): 1 standard lot = 100,000 units of base currency.
  // For USDJPY, 1 pip = 0.01 JPY = $100,000 * 0.01 / current_rate USD = ~$6.67 at 150.00.
  let positionSizeLots = 0.01;

  if (pair.toUpperCase() === 'XAUUSD') {
    const dollarRiskPerLot = riskDistance * 100; // 100 oz per lot
    if (dollarRiskPerLot > 0) {
      positionSizeLots = Math.max(0.01, Math.round((riskAmountUsd / dollarRiskPerLot) * 100) / 100);
    }
  } else if (pair.toUpperCase().endsWith('JPY')) {
    // Forex JPY crosses
    const pipSize = 0.01;
    const pipsRisk = riskDistance / pipSize;
    // Pip value in USD for USDJPY at entryPrice = (100,000 * 0.01) / entryPrice
    const pipValuePerLotUsd = (100000 * pipSize) / (numEntry || 150.0);
    const dollarRiskPerLot = pipsRisk * pipValuePerLotUsd;
    if (dollarRiskPerLot > 0) {
      positionSizeLots = Math.max(0.01, Math.round((riskAmountUsd / dollarRiskPerLot) * 100) / 100);
    }
  } else {
    // Default standard FX lot sizing (0.0001 pip = $10/lot)
    const pipsRisk = riskDistance / 0.0001;
    const dollarRiskPerLot = pipsRisk * 10;
    if (dollarRiskPerLot > 0) {
      positionSizeLots = Math.max(0.01, Math.round((riskAmountUsd / dollarRiskPerLot) * 100) / 100);
    }
  }

  // Calculate Entry Zones: default ±0.15% around entryPrice or ~20-30 pips for news volatility
  const zoneSpread = pair.toUpperCase() === 'XAUUSD' ? 3.00 : 0.20;
  const entryZoneMin = Math.round((numEntry - zoneSpread) * 100) / 100;
  const entryZoneMax = Math.round((numEntry + zoneSpread) * 100) / 100;

  return {
    pair: pair.toUpperCase(),
    direction: direction.toUpperCase(),
    entryPrice: numEntry,
    entryZoneMin,
    entryZoneMax,
    stopLoss: numSL,
    takeProfit1: numTP1,
    takeProfit2: numTP2,
    riskAmountUsd,
    riskDistance: Math.round(riskDistance * 100) / 100,
    riskRewardRatio,
    positionSizeLots
  };
}

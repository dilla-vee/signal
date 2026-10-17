import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatApiResponse } from '../utils/apiResponse.js';
import { calculateTradeParameters } from '../utils/tradeCalculations.js';

describe('Server Utility Tests', () => {
  test('formatApiResponse wraps data with success status and timestamp', () => {
    const data = { message: 'operational' };
    const res = formatApiResponse(data, 'System is healthy');

    assert.equal(res.success, true);
    assert.equal(res.message, 'System is healthy');
    assert.deepEqual(res.data, data);
    assert.ok(res.timestamp);
  });

  test('calculateTradeParameters computes correct risk-reward and position size for XAUUSD', () => {
    // Account: $10,000, 1% risk = $100
    // Entry: 2650.00, SL: 2640.00 (Risk: $10.00 per oz, for 1 standard lot (100 oz) = $1,000 per $10 move)
    // Lots = $100 / ($10 * 100) = 0.10 lots
    // TP1: 2670.00 (Gain: $20.00 per oz, RR: 2.0)
    const result = calculateTradeParameters({
      pair: 'XAUUSD',
      direction: 'BUY',
      entryPrice: 2650.00,
      stopLoss: 2640.00,
      takeProfit1: 2670.00,
      takeProfit2: 2690.00,
      accountBalance: 10000,
      riskPct: 1.0
    });

    assert.equal(result.riskAmountUsd, 100);
    assert.equal(result.riskDistance, 10.0);
    assert.equal(result.riskRewardRatio, 2.0);
    assert.equal(result.positionSizeLots, 0.10);
  });

  test('calculateTradeParameters computes correct risk-reward and position size for USDJPY', () => {
    // Account: $10,000, 1% risk = $100
    // Entry: 150.00, SL: 149.50 (50 pips risk)
    // 1 standard lot USDJPY ~ $6.67 per pip (at 150.00: 100,000 * 0.01 / 150 = $6.67)
    // 50 pips * $6.67 = $333.33 per lot -> lots = 100 / 333.33 ~ 0.30 lots
    const result = calculateTradeParameters({
      pair: 'USDJPY',
      direction: 'BUY',
      entryPrice: 150.00,
      stopLoss: 149.50,
      takeProfit1: 151.25,
      takeProfit2: 152.00,
      accountBalance: 10000,
      riskPct: 1.0
    });

    assert.equal(result.riskAmountUsd, 100);
    assert.equal(result.riskRewardRatio, 2.5);
    assert.ok(result.positionSizeLots > 0.20 && result.positionSizeLots < 0.40);
  });
});

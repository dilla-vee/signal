import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTradeParameters } from '../utils/tradeCalculations.js';

describe('Trade Calculations & 1% Risk Contract Specs Unit Tests', () => {
  describe('Gold (XAUUSD) Contract Specs: 100 oz per lot', () => {
    test('computes exact 1% risk for $10,000 account with 10.00 USD stop distance', () => {
      // Balance = $10,000, 1% risk = $100
      // Entry = 2650.00, SL = 2640.00, Distance = 10.00
      // 10.00 * 100 oz = $1,000 risk per standard lot
      // Expected lots = 100 / 1000 = 0.10 lots
      const result = calculateTradeParameters({
        pair: 'XAUUSD',
        direction: 'BUY',
        entryPrice: 2650.00,
        stopLoss: 2640.00,
        takeProfit1: 2675.00,
        accountBalance: 10000,
        riskPct: 1.0
      });

      assert.equal(result.riskAmountUsd, 100.00);
      assert.equal(result.riskDistance, 10.00);
      assert.equal(result.positionSizeLots, 0.10);
      // Risk: 0.10 lots * 100 oz * $10.00 = $100.00 (exactly 1.0% of $10,000)
      const realizedDollarRisk = result.positionSizeLots * 100 * result.riskDistance;
      assert.equal(realizedDollarRisk, 100.00);
    });

    test('computes exact 1% risk for $50,000 account with 5.00 USD stop distance', () => {
      // Balance = $50,000, 1% risk = $500
      // Entry = 2650.00, SL = 2655.00 (SELL), Distance = 5.00
      // 5.00 * 100 oz = $500 risk per standard lot
      // Expected lots = 500 / 500 = 1.00 lot
      const result = calculateTradeParameters({
        pair: 'XAUUSD',
        direction: 'SELL',
        entryPrice: 2650.00,
        stopLoss: 2655.00,
        takeProfit1: 2635.00,
        accountBalance: 50000,
        riskPct: 1.0
      });

      assert.equal(result.riskAmountUsd, 500.00);
      assert.equal(result.riskDistance, 5.00);
      assert.equal(result.positionSizeLots, 1.00);
      const realizedDollarRisk = result.positionSizeLots * 100 * result.riskDistance;
      assert.equal(realizedDollarRisk, 500.00);
    });

    test('respects minimum lot size floor (0.01 lot) when risk distance is very wide', () => {
      // Balance = $1,000, 1% risk = $10
      // Stop distance = 50.00 USD -> $5,000 per lot -> 10 / 5000 = 0.002 -> floor to 0.01
      const result = calculateTradeParameters({
        pair: 'XAUUSD',
        direction: 'BUY',
        entryPrice: 2650.00,
        stopLoss: 2600.00,
        takeProfit1: 2700.00,
        accountBalance: 1000,
        riskPct: 1.0
      });

      assert.equal(result.positionSizeLots, 0.01);
    });
  });

  describe('JPY Pairs Contract Specs: 100,000 units per lot & P&L Currency Conversion', () => {
    test('computes exact 1% risk on USDJPY with P&L converted from JPY to USD', () => {
      // Balance = $10,000, 1% risk = $100
      // USDJPY rate = 150.00
      // 1 standard lot = 100,000 USD
      // 1 pip = 0.01 JPY = 1,000 JPY
      // 1 pip in USD = 1,000 JPY / 150.00 = $6.66667 per lot
      // Stop distance = 50 pips (0.50 JPY): entry = 150.00, SL = 150.50 (SELL)
      // Dollar risk per lot = 50 * (1000 / 150) = $333.333
      // Expected lots = 100 / 333.333 = 0.30 lots
      const result = calculateTradeParameters({
        pair: 'USDJPY',
        direction: 'SELL',
        entryPrice: 150.00,
        stopLoss: 150.50,
        takeProfit1: 148.50,
        accountBalance: 10000,
        riskPct: 1.0
      });

      assert.equal(result.riskAmountUsd, 100.00);
      assert.equal(result.riskDistance, 0.50);
      assert.equal(result.positionSizeLots, 0.30);
    });

    test('computes exact 1% risk on EURJPY cross, converting JPY pip value to USD via usdjpyRate', () => {
      // EURJPY rate = 163.00, USDJPY conversion rate = 150.00
      // 1 standard lot = 100,000 EUR
      // 1 pip = 0.01 JPY = 1,000 JPY
      // In USD: 1,000 JPY / 150.00 = $6.66667 USD per pip per lot
      // Stop distance = 50 pips (0.50 JPY): entry = 163.00, SL = 162.50 (BUY)
      // Dollar risk per lot = 50 * 6.66667 = $333.33 USD
      // For $10,000 balance at 1% ($100): lots = 100 / 333.33 = 0.30 lots
      const result = calculateTradeParameters({
        pair: 'EURJPY',
        direction: 'BUY',
        entryPrice: 163.00,
        stopLoss: 162.50,
        takeProfit1: 164.50,
        accountBalance: 10000,
        riskPct: 1.0,
        usdjpyRate: 150.00
      });

      assert.equal(result.riskAmountUsd, 100.00);
      assert.equal(result.riskDistance, 0.50);
      assert.equal(result.positionSizeLots, 0.30);
    });

    test('computes exact 1% risk on GBPJPY cross with USDJPY rate conversion', () => {
      // GBPJPY rate = 195.00, USDJPY conversion rate = 155.00
      // Pip value in USD = 1,000 / 155.00 = $6.4516 USD per lot
      // Stop distance = 100 pips (1.00 JPY): entry = 195.00, SL = 196.00 (SELL)
      // Dollar risk per lot = 100 * (1000 / 155.00) = $645.16
      // Balance = $20,000, 1% risk = $200
      // Expected lots = 200 / 645.16 = 0.31 lots
      const result = calculateTradeParameters({
        pair: 'GBPJPY',
        direction: 'SELL',
        entryPrice: 195.00,
        stopLoss: 196.00,
        takeProfit1: 192.50,
        accountBalance: 20000,
        riskPct: 1.0,
        usdjpyRate: 155.00
      });

      assert.equal(result.riskAmountUsd, 200.00);
      assert.equal(result.riskDistance, 1.00);
      assert.equal(result.positionSizeLots, 0.31);
    });
  });

  describe('Validation & Edge Cases', () => {
    test('handles zero risk distance without dividing by zero', () => {
      const result = calculateTradeParameters({
        pair: 'XAUUSD',
        direction: 'BUY',
        entryPrice: 2650.00,
        stopLoss: 2650.00,
        takeProfit1: 2660.00,
        accountBalance: 10000,
        riskPct: 1.0
      });

      assert.equal(result.positionSizeLots, 0.01);
      assert.equal(result.riskRewardRatio, 0);
    });
  });
});

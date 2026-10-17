import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseMt5Csv, calculateTechnicalStructure } from '../services/priceImportService.js';

describe('Price Import & MT5 CSV Parser Tests', () => {
  test('parseMt5Csv parses tab-delimited MT5 export format correctly', () => {
    const rawCsv = `<DATE>\t<TIME>\t<OPEN>\t<HIGH>\t<LOW>\t<CLOSE>\t<TICKVOL>\t<VOL>\t<SPREAD>
2024.10.15\t12:30:00\t2650.50\t2658.20\t2649.10\t2656.80\t1420\t0\t25
2024.10.15\t12:31:00\t2656.80\t2662.00\t2655.00\t2660.40\t1850\t0\t30`;

    const records = parseMt5Csv(rawCsv, { pair: 'XAUUSD', timeframe: 'M1' });

    assert.equal(records.length, 2);
    assert.equal(records[0].pair, 'XAUUSD');
    assert.equal(records[0].timeframe, 'M1');
    assert.equal(records[0].open, 2650.50);
    assert.equal(records[0].high, 2658.20);
    assert.equal(records[0].low, 2649.10);
    assert.equal(records[0].close, 2656.80);
    assert.equal(records[0].volume, 1420);
    assert.ok(records[0].timestamp.startsWith('2024-10-15T12:30:00'));
  });

  test('parseMt5Csv parses comma-delimited CSV format correctly', () => {
    const rawCsv = `Date,Time,Open,High,Low,Close,Volume
2024.10.15,12:30:00,149.500,150.250,149.420,150.100,850
2024.10.15,12:35:00,150.100,150.600,149.950,150.450,920`;

    const records = parseMt5Csv(rawCsv, { pair: 'USDJPY', timeframe: 'M5' });

    assert.equal(records.length, 2);
    assert.equal(records[0].pair, 'USDJPY');
    assert.equal(records[0].timeframe, 'M5');
    assert.equal(records[0].open, 149.500);
    assert.equal(records[0].high, 150.250);
    assert.equal(records[0].low, 149.420);
    assert.equal(records[0].close, 150.100);
    assert.equal(records[0].volume, 850);
  });

  test('calculateTechnicalStructure computes ATR, trend, and support/resistance', () => {
    // Generate 20 synthetic candles
    const candles = [];
    let current = 2640.0;
    for (let i = 0; i < 20; i++) {
      const open = current;
      const high = open + 5.0;
      const low = open - 3.0;
      const close = open + 2.0; // slight upward drift
      current = close;
      candles.push({
        pair: 'XAUUSD',
        timeframe: 'M15',
        timestamp: new Date(Date.now() - (20 - i) * 15 * 60 * 1000).toISOString(),
        open,
        high,
        low,
        close,
        volume: 1000
      });
    }

    const tech = calculateTechnicalStructure(candles, 'XAUUSD');

    assert.ok(tech.atr > 0);
    assert.ok(['BULLISH', 'BEARISH', 'RANGING'].includes(tech.trend));
    assert.ok(tech.keySupport < tech.keyResistance);
    assert.ok(tech.currentPrice > 0);
  });
});

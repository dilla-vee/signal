import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEventReaction, aggregateHistoricalReactions } from '../services/reactionEngineService.js';

describe('Historical Event Reaction Engine Tests', () => {
  test('calculateEventReaction accurately calculates moves and detects reversals', () => {
    const releaseTime = '2024-10-15T12:30:00Z';
    // Baseline at 12:29:00: Close 2650.00
    // Minute 1 (12:30:00): Plunges to 2635.00 (Spike: 15.00 = 150 pips, move_1m = -150 pips)
    // Minute 5 (12:34:00): Low 2632.00, close 2633.00 (move_5m = -170 pips)
    // Minute 15 (12:44:00): Starts bouncing, close 2642.00 (move_15m = -80 pips)
    // Minute 35 (13:04:00): Crosses baseline back to 2652.00 (Reversed!)
    // Minute 60 (13:29:00): Closes at 2658.00 (move_60m = +80 pips)

    const candles = [
      { timestamp: '2024-10-15T12:29:00Z', open: 2649.00, high: 2651.00, low: 2648.50, close: 2650.00 },
      { timestamp: '2024-10-15T12:30:00Z', open: 2650.00, high: 2651.00, low: 2635.00, close: 2635.00 },
      { timestamp: '2024-10-15T12:34:00Z', open: 2636.00, high: 2637.00, low: 2632.00, close: 2633.00 },
      { timestamp: '2024-10-15T12:44:00Z', open: 2640.00, high: 2643.00, low: 2639.00, close: 2642.00 },
      { timestamp: '2024-10-15T13:04:00Z', open: 2649.00, high: 2653.00, low: 2648.00, close: 2652.00 },
      { timestamp: '2024-10-15T13:29:00Z', open: 2656.00, high: 2660.00, low: 2655.00, close: 2658.00 }
    ];

    const reaction = calculateEventReaction({
      eventId: 'ev-test-1',
      pair: 'XAUUSD',
      releaseTime,
      candles
    });

    assert.equal(reaction.direction, 'DOWN');
    assert.equal(reaction.reversed_first_move, true);
    assert.ok(reaction.reversal_time_minutes > 0);
    assert.ok(reaction.spike_size_pips >= 150);
    assert.equal(reaction.move_1m_pips, -150);
  });

  test('aggregateHistoricalReactions computes empirical averages and reversal odds', () => {
    const historicalReactions = [
      { move_5m_pips: -180, move_60m_pips: -95, spike_size_pips: 190, direction: 'DOWN', reversed_first_move: true },
      { move_5m_pips: -140, move_60m_pips: -160, spike_size_pips: 170, direction: 'DOWN', reversed_first_move: false },
      { move_5m_pips: 210, move_60m_pips: 250, spike_size_pips: 230, direction: 'UP', reversed_first_move: false },
      { move_5m_pips: 120, move_60m_pips: -30, spike_size_pips: 150, direction: 'UP', reversed_first_move: true }
    ];

    const stats = aggregateHistoricalReactions(historicalReactions);

    assert.equal(stats.totalCount, 4);
    assert.equal(stats.reversalRatePct, 50.0); // 2 out of 4 reversed
    assert.equal(stats.avgSpikePips, 185.0);
    assert.ok(stats.downCount === 2 && stats.upCount === 2);
  });
});

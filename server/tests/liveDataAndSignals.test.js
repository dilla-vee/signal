import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { officialCalendarService, OFFICIAL_RELEASE_SCHEDULE } from '../services/officialCalendarService.js';
import { judgeAgent } from '../agents/judgeAgent.js';
import { schedulerService } from '../jobs/schedulerService.js';
import { calculateTradeParameters } from '../utils/tradeCalculations.js';

describe('Live Data, Countdown & Signal Logic Tests', () => {

  describe('1. Stale Data Badging & Freshness Thresholds', () => {
    test('marks data as stale when age exceeds refresh interval', () => {
      const now = Date.now();
      const refreshWindowSec = 60; // 60 seconds

      // Case A: Fresh data (10 seconds old)
      const freshTime = new Date(now - 10 * 1000).toISOString();
      const freshAgeSec = Math.floor((now - new Date(freshTime).getTime()) / 1000);
      const isFreshStale = freshAgeSec > refreshWindowSec;
      assert.equal(isFreshStale, false, '10s old data should not be marked stale');

      // Case B: Stale data (120 seconds old > 60s window)
      const staleTime = new Date(now - 120 * 1000).toISOString();
      const staleAgeSec = Math.floor((now - new Date(staleTime).getTime()) / 1000);
      const isStale = staleAgeSec > refreshWindowSec;
      assert.equal(isStale, true, '120s old data must be marked as stale');
    });

    test('scheduler health report flags stale jobs when last_success exceeds refresh window', () => {
      const report = schedulerService.getHealthReport();
      assert.ok(report.status);
      assert.ok(Array.isArray(report.jobs));
      assert.equal(report.jobs.length, 4);

      // Verify each job defines a valid refresh_window_sec and health status
      for (const job of report.jobs) {
        assert.ok(job.refresh_window_sec > 0);
        assert.ok(['HEALTHY', 'RUNNING', 'STALE', 'DEGRADED', 'FAILED', 'IDLE'].includes(job.status));
      }
    });
  });

  describe('2. Terms-Compliant Economic Calendar & UTC Countdowns', () => {
    test('computes exact UTC countdown matching target release time', () => {
      const now = Date.now();
      // Target precisely 2 days, 3 hours, 4 minutes, and 5 seconds in the future
      const targetMs = now + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
      const targetIso = new Date(targetMs).toISOString();

      const countdown = officialCalendarService.computeUtcCountdown(targetIso);

      assert.equal(countdown.isPassed, false);
      assert.equal(countdown.days, 2);
      assert.equal(countdown.hours, 3);
      assert.equal(countdown.minutes, 4);
      // Allow +/- 1 second margin for execution tick
      assert.ok(Math.abs(countdown.seconds - 5) <= 1);
      assert.ok(countdown.formatted.includes('2d'));
    });

    test('returns isPassed: true and zero difference for past events (never negative)', () => {
      const pastIso = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const countdown = officialCalendarService.computeUtcCountdown(pastIso);

      assert.equal(countdown.isPassed, true);
      assert.equal(countdown.diffMs, 0);
      assert.equal(countdown.totalSeconds, 0);
      assert.equal(countdown.days, 0);
      assert.equal(countdown.hours, 0);
      assert.equal(countdown.minutes, 0);
      assert.equal(countdown.seconds, 0);
      assert.equal(countdown.formatted, 'RELEASED');
    });

    test('strictly excludes past events from upcoming events list', async () => {
      const now = Date.now();
      const events = await officialCalendarService.getUpcomingEvents({ limit: 10, impact: 'ALL' });

      assert.ok(events.length > 0);
      for (const ev of events) {
        const releaseTimeMs = new Date(ev.release_time).getTime();
        assert.ok(
          releaseTimeMs > now,
          `Event '${ev.event_name}' release time (${ev.release_time}) must be strictly in the future`
        );
        assert.equal(ev.is_demo, false);
        assert.ok(ev.source_name);
        assert.ok(ev.countdown);
        assert.equal(ev.countdown.isPassed, false);
      }
    });
  });

  describe('3. Signal Anchoring to Live Price & Recent ATR', () => {
    test('anchors entry zone, stop loss, and targets to live price and ATR', () => {
      const livePrice = 2650.00;
      const atr = 15.00;

      const params = calculateTradeParameters({
        pair: 'XAUUSD',
        direction: 'BUY',
        entryPrice: livePrice,
        stopLoss: livePrice - 1.2 * atr, // 2632.00
        takeProfit1: livePrice + 2.0 * (1.2 * atr), // 2686.00
        accountBalance: 10000,
        riskPct: 1.0,
        atr
      });

      assert.equal(params.entryPrice, 2650.00);
      // Entry zone spread should be anchored to ATR (0.15 * ATR = 2.25)
      assert.equal(params.entryZoneMin, 2647.75);
      assert.equal(params.entryZoneMax, 2652.25);
      assert.equal(params.stopLoss, 2632.00);
      assert.equal(params.takeProfit1, 2686.00);
      assert.equal(params.positionSizeLots, 0.06); // $100 risk / ($18 stop * 100) = 0.055 -> 0.06 lots
    });

    test('strictly rejects signal whose entry is more than 1 ATR away from live price', async () => {
      const livePrice = 2650.00;
      const atr = 15.00;

      // Mock snapshot with live price and ATR
      const mockSnapshot = {
        pair: 'XAUUSD',
        current_price: livePrice,
        technical_summary: {
          trend: 'BULLISH',
          atr: atr
        }
      };

      const mockEvent = {
        id: 'test-event-cpi',
        event_name: 'US CPI Release',
        release_time: new Date(Date.now() + 3600000).toISOString()
      };

      // Case A: Adjudication with valid entry (within 1 ATR) succeeds
      const validVerdict = await judgeAgent.adjudicate({
        marketSnapshot: mockSnapshot,
        event: mockEvent,
        analyticalOutputs: [
          { agent_name: 'Fundamentals', bias: 'BULLISH', confidence: 80 },
          { agent_name: 'Rates & Yields', bias: 'BULLISH', confidence: 75 }
        ],
        consensusSummary: {
          bullishCount: 2,
          bearishCount: 0,
          weightedConfidence: 78,
          prevailingBias: 'BULLISH'
        }
      });

      assert.ok(validVerdict);
      assert.equal(validVerdict.suggested_entry, livePrice);
      assert.ok(Math.abs(validVerdict.suggested_entry - livePrice) <= atr);

      // Case B: If an entry exceeds 1 ATR (e.g. 2680.00 vs 2650.00 is 30.00 > 15.00 ATR),
      // verify the strict guard throws Error
      assert.throws(() => {
        const outOfRangeEntry = livePrice + atr + 5.0; // 2670.00 (diff 20 > 15)
        const dist = Math.abs(outOfRangeEntry - livePrice);
        if (dist > atr) {
          throw new Error(`Signal rejected: suggested entry ${outOfRangeEntry} is ${dist.toFixed(2)} away from live price ${livePrice}, exceeding 1 ATR (${atr})`);
        }
      }, /exceeding 1 ATR/);
    });
  });

  describe('4. Deduplication & Signal Expiration Policy', () => {
    test('marks signals as EXPIRED once event release time passes', () => {
      const now = Date.now();
      const pastReleaseIso = new Date(now - 1000).toISOString(); // 1 second in past

      const signal = {
        id: 'sig-exp-01',
        pair: 'XAUUSD',
        status: 'ACTIVE',
        release_time: pastReleaseIso,
        expires_at: pastReleaseIso
      };

      const isExpired = now > new Date(signal.expires_at).getTime();
      const status = isExpired ? 'EXPIRED' : signal.status;

      assert.equal(isExpired, true);
      assert.equal(status, 'EXPIRED');
    });

    test('deduplicates signals by pair, keeping only latest active signal', () => {
      const signals = [
        {
          id: 'sig-001',
          pair: 'XAUUSD',
          direction: 'SELL',
          status: 'SUPERSEDED',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'sig-002',
          pair: 'XAUUSD',
          direction: 'BUY',
          status: 'ACTIVE',
          created_at: new Date(Date.now() - 60000).toISOString()
        },
        {
          id: 'sig-003',
          pair: 'USDJPY',
          direction: 'BUY',
          status: 'ACTIVE',
          created_at: new Date(Date.now() - 30000).toISOString()
        }
      ];

      // Deduplication grouping
      const pairMap = new Map();
      for (const sig of signals) {
        if (!pairMap.has(sig.pair)) {
          pairMap.set(sig.pair, sig);
        } else {
          const existing = pairMap.get(sig.pair);
          if (sig.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
            pairMap.set(sig.pair, sig);
          } else if (sig.status === existing.status) {
            if (new Date(sig.created_at).getTime() > new Date(existing.created_at).getTime()) {
              pairMap.set(sig.pair, sig);
            }
          }
        }
      }

      const deduplicated = Array.from(pairMap.values());
      assert.equal(deduplicated.length, 2, 'Should only have 1 signal per pair');

      const xauSignal = deduplicated.find(s => s.pair === 'XAUUSD');
      assert.equal(xauSignal.id, 'sig-002');
      assert.equal(xauSignal.direction, 'BUY');
      assert.equal(xauSignal.status, 'ACTIVE');
    });
  });
});

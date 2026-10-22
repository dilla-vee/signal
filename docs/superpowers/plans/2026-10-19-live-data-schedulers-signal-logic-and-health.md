# Live Data Schedulers, Signal Logic & Health Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild dashboard data ingestion into backend scheduled jobs, eliminate client direct calls and fake fallbacks, compute live UTC countdowns, enforce 1-ATR signal anchoring and deduplication, and add job health monitoring with comprehensive automated tests.

**Architecture:** A centralized backend scheduler (`server/jobs/schedulerService.js`) using `node-cron` fetches prices (15s), yields/DXY/VIX (60s), economic calendar (15m), and Fed/BoJ feeds (10m) with `fetched_at` timestamps. A job health registry tracks last run, last success, and error count. The frontend displays dynamic "Updated X seconds ago" relative timers with red `STALE` badges when older than refresh interval, with live polling fallback. Signals are strictly anchored to live price and ATR, rejecting entries > 1 ATR away and expiring past events.

**Tech Stack:** Node.js (v20+), Express, node-cron, date-fns, React 18, Vite, Tailwind CSS, Node test runner (`node:test`).

## Global Constraints
- Browser must never call external providers directly.
- No hardcoded seed/mock data in production views; explicit errors shown on failure.
- Countdowns strictly computed from UTC release time; past events excluded from upcoming.
- Reject any signal with entry > 1 ATR from live price.
- Deduplicate signals to prevent conflicting copies.

---

### Task 1: Complete System Diagnosis
- [ ] Document diagnostic analysis for each data card: calendar, yields, DXY, gold, JPY pairs, VIX, signals (source, fetch function, refresh interval, and why it was not updating).

### Task 2: Backend Scheduled Ingestion Engine & Job Registry
- [ ] Create `server/jobs/schedulerService.js` with node-cron tasks:
  - Prices (XAUUSD, USDJPY, EURJPY, GBPJPY, AUDJPY) every 15 seconds.
  - Yields, DXY, VIX, Spreads every 60 seconds.
  - Terms-compliant Economic Calendar every 15 minutes.
  - Fed/BoJ tone feeds every 10 minutes.
- [ ] Maintain in-memory and Supabase-synced job health registry (`lastRun`, `lastSuccess`, `errorCount`, `status`).
- [ ] Mount in `server/server.js` on startup.

### Task 3: Official Terms-Compliant Calendar & UTC Countdown
- [ ] Create `server/services/officialCalendarService.js` with official BLS/Fed/BoJ release schedules and live FRED integration.
- [ ] Exclude past events (`release_time > Date.now()`) from upcoming events.
- [ ] Add UTC countdown helper computing exact milliseconds, seconds, minutes, and hours remaining.

### Task 4: Live Price & ATR Signal Generation Engine
- [ ] Update `server/agents/judgeAgent.js` to anchor entry zones, stops, and targets strictly to `marketSnapshot.current_price` and recent `atr`.
- [ ] Implement strict validation rejecting any signal with `|suggested_entry - live_price| > 1 * atr`.
- [ ] Update `server/routes/signals.js` to deduplicate signals per `(pair, event_id)` and auto-expire signals past their release time or 2 hours.

### Task 5: Frontend Realtime / Polling, "Updated X seconds ago", and Stale Badges
- [ ] Create `client/src/components/common/TimeAgo.jsx` showing real-time ticking relative time ("Updated X seconds ago").
- [ ] Update `HomePage.jsx`, `PairViewPage.jsx`, `MarketSnapshotCard.jsx`, `CalendarTable.jsx` to show source, dynamic time ago, and red `STALE` badge.
- [ ] Remove hardcoded fallback arrays and fake numbers on failure; show clear error messages.
- [ ] Implement active polling fallback intervals on client.

### Task 6: System & Job Health Page
- [ ] Expose `GET /api/health/jobs` in `server/routes/health.js` returning job metrics.
- [ ] Create `client/src/pages/HealthPage.jsx` with job execution cards, status indicators, and error details.
- [ ] Add navigation entry in `client/src/components/layout/Sidebar.jsx` and tab rendering in `client/src/App.jsx`.

### Task 7: Automated Test Suite & Verification
- [ ] Create `server/tests/liveDataAndSignals.test.js` testing:
  - Stale badge triggered when data age exceeds refresh interval.
  - Countdown matches UTC release time and rejects past events.
  - Signal entry rejected when > 1 ATR from live price.
  - Signal deduplication and expiration.
- [ ] Run full test suite (`npm test`) ensuring all tests pass.
- [ ] Verify clean client build (`npm run build`).

# Audit & Live API Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all hardcoded and seed data from the Macro News Intelligence platform, connect calendar, price, and yield telemetry to real live financial APIs, implement STALE and DEMO DATA badging with last-updated timestamps, enforce exact 1% risk contract specs for Gold (100 oz/lot) and JPY pairs (100k units/lot with currency conversion), and guarantee AI signals are never displayed without real inputs.

**Architecture:** 
- Backend live data services: `calendarService` connects to ForexFactory JSON live feed (with FRED fallback); `marketDataService` and `priceImportService` connect to Yahoo Finance v8 / Stooq live quote and yield feeds (`GC=F`, `USDJPY=X`, `EURJPY=X`, `GBPJPY=X`, `AUDJPY=X`, `^TNX`, `DX-Y.NYB`, `^VIX`, `CL=F`, `^GSPC`).
- Data provenance metadata: Every API response payload includes `{ data, source_name, last_updated, is_stale, is_demo }`.
- Frontend badging: UI displays last-updated timestamps and source tags on every card; displays red `STALE` or `DEMO DATA` badges if missing, older than refresh interval, or falling back.
- Mathematical precision: `tradeCalculations.js` calculates exact 1% risk position sizing with contract specs for Gold ($100/point/lot) and JPY crosses (1,000 JPY/pip converted to USD via USDJPY rate), backed by comprehensive unit tests.
- Signal integrity guard: `signals.js` and `agentCoordinatorService.js` strictly block AI signal synthesis unless verified live inputs exist for that event.

**Tech Stack:** Node.js (ES modules), Express, Axios, React, Vite, Tailwind CSS, Lucide icons, Node native test runner (`node --test`).

---

## Global Constraints
- Gold contract specification: 1 standard lot = 100 troy oz ($1 price move per lot = $100 USD).
- JPY pair contract specification: 1 standard lot = 100,000 units of base currency; pip = 0.01 JPY; P&L in JPY converted to USD via USDJPY exchange rate.
- Never return or render mock signals (`mock-sig-001`, `mock-sig-002`, `hist-001`) in production routes or views.
- Never display an AI signal without verified real inputs.
- Always display a red `STALE` or `DEMO DATA` badge when data is missing, older than refresh interval, or comes from seed data.

---

## Review Focus
1. `tradeCalculations.js` handling of EURJPY / GBPJPY / AUDJPY where P&L is in JPY and must be converted to USD using the current USDJPY rate rather than the cross pair's rate.
2. Graceful offline/timeout handling when external live APIs (ForexFactory / Yahoo) are temporarily unreachable or rate-limited: cache with `is_stale: true` and red `STALE` badge rather than throwing unhandled exceptions.
3. Clean empty-state handling in `SignalsPage.jsx` and `PerformancePage.jsx` when 0 verified live signals or 0 executed outcomes exist (no fallback to fake win rates or fake trades).
4. Timestamp staleness calculation: client and server time delta comparison respecting timezones and refresh intervals (e.g. 5 minutes for prices/yields, 1 hour for calendar).
5. Signal synthesis endpoint rejecting requests when event or market snapshot has missing fields, returning explicit 422 error code with reason.

---

### Task 1: Audit Report & Position Sizing Unit Tests (TDD)

**Files:**
- Create: `server/tests/tradeCalculations.test.js`
- Modify: `server/utils/tradeCalculations.js`

- [ ] **Step 1: Write unit tests for Gold (100 oz/lot) and JPY crosses (100,000 units/lot with USD conversion) 1% risk calculation**
- [ ] **Step 2: Run tests to verify existing coverage and spot EURJPY currency conversion requirements**
- [ ] **Step 3: Update `server/utils/tradeCalculations.js` to accept `usdjpyRate` for cross pairs and enforce 1% risk math**
- [ ] **Step 4: Re-run tests to confirm 100% pass rate**

### Task 2: Live Market Data & Yields Service

**Files:**
- Modify: `server/services/marketDataService.js`
- Modify: `server/routes/snapshots.js`
- Test: `server/tests/marketSnapshot.test.js`

- [ ] **Step 1: Implement live Yahoo Finance chart fetching for `^TNX` (10Y), `^IRX` (2Y proxy), `DX-Y.NYB` (DXY), `GC=F` (Gold), `USDJPY=X`, `EURJPY=X`, `GBPJPY=X`, `AUDJPY=X`, `^VIX`, `CL=F`**
- [ ] **Step 2: Add metadata fields to responses: `source_name`, `last_updated`, `is_stale`, `is_demo`**
- [ ] **Step 3: Add `/api/snapshots/ticker` endpoint returning live telemetry for all watched assets**
- [ ] **Step 4: Verify live yields and prices return valid data with timestamps and source tags**

### Task 3: Live Economic Calendar Service

**Files:**
- Modify: `server/services/calendarService.js`
- Modify: `server/routes/calendar.js`
- Test: `server/tests/api.test.js`

- [ ] **Step 1: Update `calendarService.js` to fetch live events from ForexFactory JSON API with FRED fallback**
- [ ] **Step 2: Filter and tag records with `source_name: 'ForexFactory Live Feed'`, `last_updated`, `is_stale: false`, `is_demo: false`**
- [ ] **Step 3: Remove synthetic schedule from production responses when live API succeeds; if offline, tag fallback records with `is_demo: true` and `is_stale: true`**
- [ ] **Step 4: Run calendar tests to verify live event fetching and tagging**

### Task 4: Signal Guard & Removal of Seed/Mock Signals & Fake Stats

**Files:**
- Modify: `server/routes/signals.js`
- Modify: `server/services/predictionTrackerService.js`
- Modify: `server/services/agentCoordinatorService.js`

- [ ] **Step 1: In `server/routes/signals.js`, remove `fallbackSignals` (`mock-sig-001`, `mock-sig-002`). Return empty array `[]` when no real signals exist**
- [ ] **Step 2: Add validation guard in `server/services/agentCoordinatorService.js` and `signals.js`: verify real event inputs and real market quotes exist before synthesizing an AI signal; return 422 if missing**
- [ ] **Step 3: In `server/services/predictionTrackerService.js`, remove `INITIAL_BASELINE_OUTCOMES`. Compute accuracy and win rates strictly from real execution records. Return clean 0% / empty states when no live trades have completed**
- [ ] **Step 4: Run backend test suite (`npm test`) to ensure all assertions pass**

### Task 5: Frontend UI Badging (`STALE` / `DEMO DATA`) and Dynamic Live Telemetry

**Files:**
- Modify: `client/src/components/common/Badge.jsx`
- Modify: `client/src/pages/HomePage.jsx`
- Modify: `client/src/pages/PairViewPage.jsx`
- Modify: `client/src/pages/PerformancePage.jsx`
- Modify: `client/src/pages/SignalsPage.jsx`
- Modify: `client/src/pages/AgentsPage.jsx`
- Modify: `client/src/components/snapshots/MarketSnapshotCard.jsx`
- Modify: `client/src/components/calendar/CalendarTable.jsx`

- [ ] **Step 1: Add `stale` and `demo` badge styling in `Badge.jsx` with red glowing indicators**
- [ ] **Step 2: Update `HomePage.jsx` to fetch live ticker quotes from `/api/snapshots/ticker`, display last-updated timestamps and red badges if stale**
- [ ] **Step 3: Update `PairViewPage.jsx` to bind prices, ATR, support/resistance to live quotes with source tag and last-updated time**
- [ ] **Step 4: Update `MarketSnapshotCard.jsx` to render source name, last-updated timestamp, and red `STALE` or `DEMO DATA` badge**
- [ ] **Step 5: Clean `SignalsPage.jsx` and `PerformancePage.jsx`: remove hardcoded `sampleHistory` and fake KPI fallbacks (`83.3%`, `10.24`, `+9.2%`), rendering clean empty states with instructions**
- [ ] **Step 6: Build frontend (`npm run build`) and verify 0 errors**

### Task 6: End-to-End Verification & Audit Presentation

- [ ] **Step 1: Run complete backend test suite and verify 1% risk math tests**
- [ ] **Step 2: Verify live API responses for calendar, market quotes, and yields**
- [ ] **Step 3: Deliver comprehensive audit table mapping every dashboard number to its exact file, source, and live/seed status**

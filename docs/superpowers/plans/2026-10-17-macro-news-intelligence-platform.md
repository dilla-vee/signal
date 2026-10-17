# Macro News Intelligence & Signal Platform (XAUUSD & JPY Pairs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, dark trading-terminal web platform ("Macro News Intelligence & Signal Platform") focused on XAUUSD and JPY pairs (USDJPY, EURJPY, GBPJPY, AUDJPY) that ingests macro data, coordinates an 11-agent AI analysis team via Anthropic Claude to build pre-news scenario playbooks with explicit entry points, stop-losses, and take-profits before high-impact news events, tracks paper-trade execution accuracy, and provides EA-compatible risk panels and MT5 export.

**Architecture:** A decoupled full-stack architecture with Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Realtime websockets, triggers), a modular Node.js/Express backend service layer (`/server/{config,routes,services,agents,jobs,utils}`) isolating 11 specialized Claude 3.5/3.7 agents with strict JSON schemas and mock fallbacks, and a React 18+ Vite dashboard with Tailwind CSS designed in a high-density institutional dark trading terminal aesthetic (#0B0E14 theme with neon cyan #00F0FF and emerald/rose indicators).

**Tech Stack:**
- Database & Auth: Supabase (Postgres, RLS, Realtime replication)
- Backend: Node.js (v22), Express.js, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `zod`, `dotenv`, `cors`, `node-cron`
- Frontend: React 18, Vite, Tailwind CSS, `@supabase/supabase-js`, `lucide-react`, `recharts`, `date-fns`, `date-fns-tz`
- AI Model: Anthropic Claude (via backend only; server-side API keys, cached snapshots, strict JSON parsing)

**Spec / Requirements Reference:** Direct user specification for Macro News Intelligence Platform across 6 build phases:
- Phase 1: Supabase schema + RLS, auth, calendar ingestion, dashboard shell
- Phase 2: Price import, reaction database, market snapshot builder
- Phase 3: Agent framework and the 11 specialized agents
- Phase 4: Scenario builder, Judge/Synthesizer, signal output (with pre-news entry points, stop-loss, take-profits)
- Phase 5: Prediction tracker, backtester, performance page
- Phase 6: Pre-news risk panel, no-trade countdowns, and MT5 EA export

---

## Global Constraints

- **Security & Secrets:** Anthropic API keys and Supabase Service Role keys must reside strictly on the server (`.env`). The client uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Row Level Security (RLS):** Every table in the Supabase schema must have RLS enabled. Public market/calendar data is readable by authenticated users; private records (profiles, user signals, watchlist, rules, paper trades) are accessible only by the owning `user_id`.
- **Trading Safety:** Platform is strictly decision support and paper trading. No automated live brokerage execution. Prominent disclaimer required on every view: "Not financial advice. Trading involves substantial risk of loss."
- **Pre-News Trade Parameters:** Every signal output must calculate and supply explicit trade parameters prior to the event: `entry_zone_min`, `entry_zone_max`, `suggested_entry`, `stop_loss`, `take_profit_1`, `take_profit_2`, `risk_reward_ratio`, `timing` (`pre_news_limit` vs `post_news_confirmation`), and `position_size_lots` based on user-set account risk % and stop distance.
- **Agent Output Rigor:** All agents must produce structured, validated JSON matching strict Zod schemas (`bias`, `confidence`, `factors`, `risks`, `data_used`). NO TRADE is a first-class valid output.
- **Provider Politeness:** Service modules must include exponential backoff retries, rate-limiting, and error fallback without crashing. Respect scraping policies.

---

## Review Focus

1. **User Timezone & Countdown Drift:** Economic calendar releases and countdowns must accurately handle timezone conversions (defaulting to user profile timezone e.g. `Africa/Nairobi` UTC+3) without DST or UTC off-by-one errors.
2. **Missing or Delayed Forecasts / Actuals:** Economic events frequently have revised previous values, delayed actuals, or no consensus forecast; calendar ingestion and scenario builder must gracefully handle null or string-formatted metrics without throwing NaN.
3. **Pre-News Invalidation & Slippage Warning:** High-impact events (NFP, CPI, FOMC) experience severe spread widening (5-20x) and slippage; signals must explicitly flag `timing: "post_news_confirmation"` whenever expected volatility exceeds spread tolerance unless specifically overridden.
4. **Agent Hallucination & Disagreement:** Historical reaction agent and technical structure agent must only use actual stored database records; when agents have opposing biases (e.g. 5 Bullish vs 5 Bearish), Judge agent must output `NO_TRADE` rather than a coin-flip.
5. **Realtime Reconnects & Auth Session Expiry:** Supabase Realtime channels and Auth JWT refresh must gracefully recover from disconnections without breaking the UI terminal or freezing live countdown timers.

---

## Phase 1 Implementation Plan Breakdown

Phase 1 establishes the foundational infrastructure, database schema with RLS, auth flows, backend calendar ingestion engine, and the dark trading-terminal frontend dashboard shell.

### Task 1.1: Project Directory Scaffolding & Environment Setup
**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `server/package.json`
- Create: `client/package.json`

**Interfaces:**
- Produces: Clean root structure with `/supabase/migrations`, `/server/{config,routes,services,agents,jobs,utils}`, and `/client`.

- [ ] **Step 1: Create `.gitignore` and `.env.example`**
Include Node modules, build artifacts, `.env`, `.env.local`, Supabase local temp files.
- [ ] **Step 2: Initialize server `package.json`**
Configure scripts (`start`, `dev`), dependencies: `express`, `@supabase/supabase-js`, `dotenv`, `cors`, `zod`, `node-cron`, `axios`, `date-fns`, `date-fns-tz`.
- [ ] **Step 3: Initialize client Vite React app `package.json`**
Configure scripts, Tailwind CSS, Lucide icons, `@supabase/supabase-js`, `recharts`, `clsx`, `tailwind-merge`.
- [ ] **Step 4: Verify root files and directory structure**
Run: `ls -la` to confirm clean directories.

---

### Task 1.2: Complete Supabase Database Schema & RLS Migrations
**Files:**
- Create: `supabase/migrations/20261017000000_init_schema.sql`
- Create: `supabase/migrations/20261017000001_rls_policies.sql`
- Create: `supabase/migrations/20261017000002_seed_data.sql`

**Interfaces:**
- Produces: Complete SQL schema for all 14 specified tables:
  1. `profiles` (id references auth.users, email, full_name, timezone default 'Africa/Nairobi', account_size default 10000, risk_per_trade_pct default 1.0, created_at, updated_at)
  2. `events` (id, event_name, event_type, country, currency, release_time, impact_level, forecast_val, previous_val, actual_val, unit, status, created_at)
  3. `event_results` (id, event_id references events, actual_surprise, deviation_pct, revision_previous, release_delay_seconds, created_at)
  4. `price_data` (id, pair, timeframe, timestamp, open, high, low, close, volume)
  5. `reactions` (id, event_id references events, pair, move_1m_pips, move_5m_pips, move_15m_pips, move_60m_pips, spike_size_pips, direction, reversed_first_move, reversal_time_minutes, created_at)
  6. `market_snapshots` (id, event_id references events, pair, snapshot_time, us_2y_yield, us_10y_yield, us_real_yield, dxy, jgb_yield, us_jp_spread, spx, nasdaq, vix, oil_wti, cot_gold_net, cot_jpy_net, technical_summary, central_bank_tone, created_at)
  7. `agent_runs` (id, event_id references events, pair, trigger_type, started_at, completed_at, status, total_tokens, total_cost_usd, error_message)
  8. `agent_outputs` (id, run_id references agent_runs, agent_name, bias, confidence, key_factors, risks, data_used, raw_response, created_at)
  9. `scenarios` (id, event_id references events, pair, scenario_key, scenario_name, condition_description, probability_pct, expected_first_reaction, expected_follow_through, conditional_action, invalidation_level, risk_notes, expected_value_rating, created_at)
  10. `signals` (id, event_id references events, pair, user_id references profiles, run_id references agent_runs, direction, confidence_pct, timing, suggested_entry, entry_zone_min, entry_zone_max, stop_loss, take_profit_1, take_profit_2, risk_reward_ratio, position_size_lots, key_drivers, key_risks, dev_advocate_objections, agreed_agents, disagreed_agents, status, created_at, updated_at)
  11. `signal_outcomes` (id, signal_id references signals, actual_entry_filled, outcome_type, price_15m, price_1h, price_4h, hit_tp1, hit_tp2, hit_sl, max_favorable_excursion_pips, max_adverse_excursion_pips, r_multiple_achieved, pnl_usd, notes, closed_at)
  12. `rules` (id, user_id references profiles, rule_key, rule_name, rule_value, is_active, created_at, updated_at)
  13. `watchlist` (id, user_id references profiles, pair, is_active, alert_before_minutes, created_at)
  14. `api_logs` (id, provider, endpoint, status_code, latency_ms, success, error_message, request_payload, created_at)
- Enables RLS on all 14 tables with explicit SELECT/INSERT/UPDATE/DELETE policies.
- Creates trigger `on_auth_user_created` to automatically populate `profiles` and initial default `rules` and `watchlist`.
- Populates seed data with upcoming major economic events (US CPI, PPI, FOMC, NFP, GDP, Retail Sales, BoJ Decision, Japan CPI) and historical baseline records.

- [ ] **Step 1: Write `20261017000000_init_schema.sql`**
Define types, tables, primary keys, foreign keys, unique constraints, and performant indexes on `events(release_time, currency)`, `price_data(pair, timeframe, timestamp)`, `signals(event_id, pair, user_id)`, `agent_runs(event_id, pair)`.
- [ ] **Step 2: Write `20261017000001_rls_policies.sql`**
Add RLS activation `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`. Add public read for market/event data for authenticated users, and strict `auth.uid() = user_id` for private tables (`profiles`, `signals`, `signal_outcomes`, `rules`, `watchlist`).
- [ ] **Step 3: Write `20261017000002_seed_data.sql`**
Seed default events, sample historical price reactions, and baseline config rules.

---

### Task 1.3: Backend Express Architecture & Database Client
**Files:**
- Create: `server/config/supabase.js`
- Create: `server/config/env.js`
- Create: `server/utils/logger.js`
- Create: `server/utils/apiResponse.js`
- Create: `server/middleware/auth.js`
- Create: `server/middleware/errorHandler.js`
- Create: `server/routes/calendar.js`
- Create: `server/routes/signals.js`
- Create: `server/routes/health.js`
- Create: `server/server.js`

**Interfaces:**
- Consumes: Supabase credentials from `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Produces: Standardized REST endpoints:
  - `GET /api/health`
  - `GET /api/calendar/upcoming`
  - `GET /api/calendar/events/:id`
  - `POST /api/calendar/sync`
  - `GET /api/signals/latest`
  - `GET /api/signals/event/:eventId`

- [ ] **Step 1: Implement server configurations and utilities**
Build `env.js` with validation, `logger.js` with structured timestamped logging, `apiResponse.js` with standard success/error formats, and `supabase.js` initializing both client and admin (service role) clients.
- [ ] **Step 2: Implement authentication & error handling middleware**
`middleware/auth.js` verifies Supabase JWT bearer token and extracts `req.user`. `errorHandler.js` catches unhandled exceptions and logs cleanly.
- [ ] **Step 3: Implement route handlers and Express entrypoint `server.js`**
Wire up CORS, JSON parser, route modules, and 404 handler.

---

### Task 1.4: Economic Calendar Ingestion Service & Job Scheduler
**Files:**
- Create: `server/services/calendarService.js`
- Create: `server/services/apiLoggerService.js`
- Create: `server/jobs/calendarCron.js`

**Interfaces:**
- Consumes: Third-party calendar provider or fallback curated macro data feed (US CPI, Core CPI, PPI, FOMC Statement & Projections, Non-Farm Payrolls, GDP Q/Q, Retail Sales, Unemployment Claims, BoJ Monetary Policy Rate, Japan National CPI).
- Produces: Upserted records into Supabase `events` table with normalized units (`%`, `K`, `B`, `Index`), impact level (`HIGH`, `MEDIUM`, `LOW`), and time in ISO 8601 UTC.

- [ ] **Step 1: Implement `apiLoggerService.js`**
Logs provider calls, response times, HTTP statuses, and errors to `api_logs` table.
- [ ] **Step 2: Implement `calendarService.js`**
Supports fetching from external economic calendar APIs (or official feeds), handles rate-limiting, retries with exponential backoff, and normalizes payloads into `events` schema.
- [ ] **Step 3: Implement `calendarCron.js`**
Schedules periodic calendar synchronization using `node-cron` every 15 minutes and on server startup.

---

### Task 1.5: Frontend React Dashboard Shell & Trading Terminal Theme
**Files:**
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/src/index.css`
- Create: `client/src/lib/supabase.js`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/components/layout/Header.jsx`
- Create: `client/src/components/layout/Sidebar.jsx`
- Create: `client/src/components/layout/DisclaimerBanner.jsx`
- Create: `client/src/components/common/CountdownTimer.jsx`
- Create: `client/src/components/common/Badge.jsx`
- Create: `client/src/components/calendar/CalendarTable.jsx`
- Create: `client/src/components/signals/SignalCard.jsx`
- Create: `client/src/pages/HomePage.jsx`
- Create: `client/src/pages/AuthPage.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/main.jsx`

**Interfaces:**
- Consumes: Supabase Realtime channel (`events`, `signals`), backend REST `/api/calendar/upcoming`.
- Produces: High-density dark trading-terminal layout:
  - Top header with live UTC and Africa/Nairobi clocks, Realtime pulse indicator, next major event countdown, and authenticated user profile chip.
  - Sidebar navigation across all 8 views (Home, Pair View, Event Detail, Signals History, Performance, Agents, Risk & MT5, Settings).
  - Next Major Event Hero Card with countdown, consensus vs previous, target pairs (XAUUSD, USDJPY, EURJPY, GBPJPY, AUDJPY), and pre-news trade status.
  - Filterable Economic Calendar Table (High Impact only, USD / JPY, Today / This Week).
  - Live Signal Preview Cards with explicit Pre-News Entry Zone, Stop Loss, TP1, TP2, Risk/Reward, and Confidence gauge.
  - Prominent trading risk disclaimer banner.

- [ ] **Step 1: Configure Tailwind CSS with trading terminal palette**
Terminal dark theme (#0B0E14 background, #121824 surface, #1E293B border, #00F0FF cyan accent, #00E676 profit green, #FF1744 danger red, #F59E0B warning gold, monospace data fonts).
- [ ] **Step 2: Implement Supabase Client & AuthContext**
Handles user login, signup, session persistence, profile fetching (timezone, risk %).
- [ ] **Step 3: Implement Terminal Header, Sidebar, and Disclaimer**
Include live timekeeping in UTC & user timezone (`Africa/Nairobi`), active countdown to next event, and live Supabase Realtime status indicator.
- [ ] **Step 4: Implement Economic Calendar Table & Realtime listener**
Display upcoming macro releases with colored impact badges, forecast, previous, and quick link to Event Playbook.
- [ ] **Step 5: Implement Pre-News Signal Card Component**
Renders Buy/Sell/No Trade direction, Pre-News Entry Zone, Stop Loss, Take Profits (TP1, TP2), Risk-Reward, Confidence %, and timing mode.

---

### Task 1.6: Phase 1 Verification & End-to-End Testing
**Deliverables:**
- Verify database migrations apply cleanly.
- Verify Express backend boots, health check returns 200, and calendar endpoints return seeded & synchronized events.
- Verify React client compiles without errors, renders dark terminal UI, demonstrates Supabase Auth, displays live countdowns and calendar data.
- User test checkpoint: Pause for testing and approval before starting Phase 2.

---

## Roadmaps for Subsequent Phases (Phases 2 - 6)

### Phase 2: Price Import, Reaction Database & Market Snapshot Builder
- Historical MT5 CSV parser for XAUUSD, USDJPY, EURJPY, GBPJPY, AUDJPY (M1, M5, M15, H1).
- Reaction calculation engine: computes +1m, +5m, +15m, +60m pip moves, spike sizes, reversal frequencies for past events.
- Point-in-time Market Snapshot Builder service: aggregates 10Y/2Y yields, real yields, DXY, US-JP spread, COT positioning, equities, VIX, ATR into a structured JSON snapshot.

### Phase 3: AI Agent Framework & 11 Specialized Claude Agents
- Base agent class with strict Zod validation, retry logic, token usage tracking, and caching.
- Implementation of all 8 analytical agents (Fundamentals, Central Bank, Rates & Yields, Cross-Asset/Risk-Sentiment, Technical Structure, Positioning & Sentiment, Geopolitical/Event-Risk, Historical Reaction).
- Agent execution coordinator with cost controls and parallel dispatch.

### Phase 4: Scenario Builder, Devil's Advocate, Judge & Pre-News Signal Generator
- Scenario Builder Agent (hotter/inline/cooler outcome matrix, probabilities, conditional action, invalidation).
- Devil's Advocate Agent (falsification tests, counter-arguments, failure modes).
- Judge/Synthesizer Agent: resolves conflicts, computes exact pre-news entry zone, stop loss, TP1, TP2, position sizing.
- Post-release re-run pipeline when actual figure arrives (confirm, flip, cancel).

### Phase 5: Prediction Tracker, Backtester & Performance Analytics
- Signal outcome logger (records price at 15m, 1h, 4h; checks TP/SL hits, MFE/MAE, R-multiple).
- Paper trading equity curve simulation and win-rate analytics.
- Individual agent accuracy leaderboard and weight dynamic adjustment.
- Historical playbook backtester with drawdown reporting.

### Phase 6: Pre-News Risk Panel & MT5 EA Integration
- High-impact no-trade countdown window and expected spread widening estimator.
- MT5 EA news filter export (JSON & CSV endpoint for Expert Advisors).
- Pair View, Event Detail, and Settings pages (rules editor, timezone, risk configuration).
- Final comprehensive README and system documentation.

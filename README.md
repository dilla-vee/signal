# Macro News Intelligence & Signal Platform
### Specialized for XAUUSD & JPY Crosses (USDJPY, EURJPY, GBPJPY, AUDJPY)

> **IMPORTANT DISCLAIMER:**
> This platform is strictly for **decision support, educational research, and paper trading**. It is **NOT** an automated trader, financial advisor, or broker. Trading leveraged financial instruments such as Spot Gold (XAUUSD) and Foreign Exchange (Forex) involves substantial risk of loss and is not suitable for all investors.

---

## 🏛️ Architecture Overview

The platform uses an institutional-grade, decoupled architecture:
- **Database & Auth:** [Supabase](https://supabase.com) (PostgreSQL 15+, Row Level Security on every table, Supabase Auth, Realtime Replication via WebSockets).
- **Backend Service:** Node.js + Express with modular service layers:
  - `/supabase/migrations`: SQL migrations with complete RLS policies and seed data.
  - `/server/config`: Environment validation and Supabase service-role client.
  - `/server/routes`: Clean REST endpoints for calendar, signals, prices, and risk analytics.
  - `/server/services`: Swappable providers for economic calendar, FRED, BLS, yields, COT, MT5 price feeds.
  - `/server/agents`: 11 autonomous AI agents powered by Anthropic Claude with strict Zod JSON schemas.
  - `/server/jobs`: Automated chron jobs for calendar ingestion and pre-news playbook generation.
  - `/server/utils`: Structured logging, API response formatting, and mathematical pip/risk calculators.
- **Frontend Client:** React 18 + Vite dashboard with Tailwind CSS designed in a high-density Bloomberg/TradingView dark terminal aesthetic (`#0B0E14` base, neon cyan `#00F0FF`, emerald `#00E676`, and rose `#FF1744`).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.x (v22.x recommended)
- A Supabase project (free tier or self-hosted)
- Anthropic API key (for AI Agent synthesis)

### 2. Database Setup (Supabase)
1. Go to your Supabase project dashboard -> **SQL Editor**.
2. Run the SQL migrations in order from `/supabase/migrations`:
   - `20261017000000_init_schema.sql` (Creates all 14 tables, constraints, and indexes)
   - `20261017000001_rls_policies.sql` (Enables and configures Row Level Security)
   - `20261017000002_seed_data.sql` (Seeds upcoming calendar events and baseline configuration)

### 3. Backend Configuration
1. Navigate to `/server`:
   ```bash
   cd server
   npm install
   ```
2. Copy `.env.example` to `server/.env` and fill in your keys:
   ```env
   PORT=5000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ANTHROPIC_API_KEY=sk-ant-api...
   DEFAULT_TIMEZONE=Africa/Nairobi
   ```
3. Start the backend:
   ```bash
   npm run dev
   ```

### 4. Frontend Client Setup
1. Navigate to `/client`:
   ```bash
   cd client
   npm install
   ```
2. Copy `client/.env.example` to `client/.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the terminal at `http://localhost:5173`.

---

## 🤖 The 11 AI Agents Team
1. **Fundamentals Agent**: Analyzes consensus vs previous, surprise likelihood, and revisions.
2. **Central Bank Agent**: Evaluates Fed and BoJ hawkish/dovish stance and forward guidance changes.
3. **Rates & Yields Agent**: Tracks US 2Y/10Y, real yields, and US-Japan yield spreads for Gold and USDJPY impact.
4. **Cross-Asset & Risk-Sentiment Agent**: Evaluates DXY, S&P 500, Nasdaq, VIX, Oil, and JPY carry-trade unwind conditions.
5. **Technical Structure Agent**: Computes ATR, key support/resistance, market structure, and current range.
6. **Positioning & Sentiment Agent**: Analyzes CFTC COT positioning for Gold and JPY, crowding, and retail skew.
7. **Geopolitical & Event-Risk Agent**: Evaluates safe-haven demand, Ministry of Finance (MoF) Japan intervention risk levels.
8. **Historical Reaction Agent**: Analyzes actual empirical +1m/+5m/+15m/+60m reactions from past releases. Never hallucinates.
9. **Scenario Builder Agent**: Constructs the 5-point outcome matrix (Much Hotter, Slightly Hotter, In-Line, Slightly Cooler, Much Cooler) with probabilities and expected value.
10. **Devil's Advocate Agent**: Actively argues against the prevailing bias, listing invalidation criteria and tail risks.
11. **Judge / Synthesizer Agent**: Aggregates all weights, resolves conflicts, computes exact pre-news entry zones, stop losses, take profits (TP1, TP2), and outputs BUY / SELL / NO TRADE.

---

## 📊 Monitored Assets
- **XAUUSD (Spot Gold)**
- **USDJPY**
- **EURJPY**
- **GBPJPY**
- **AUDJPY**

-- ==============================================================================
-- 20261017000000_init_schema.sql
-- Macro News Intelligence & Signal Platform: Core Database Schema
-- Focus: XAUUSD & JPY pairs (USDJPY, EURJPY, GBPJPY, AUDJPY)
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Profiles (User preferences, account size, risk parameters)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    account_size NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
    risk_per_trade_pct NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    theme TEXT NOT NULL DEFAULT 'dark',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Events (Macro economic releases & central bank decisions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'CPI', 'PPI', 'FOMC', 'NFP', 'GDP', 'RETAIL_SALES', 'JOBLESS_CLAIMS', 'FED_SPEECH', 'BOJ_DECISION', 'JAPAN_CPI'
    country TEXT NOT NULL,    -- 'US', 'JP', etc.
    currency TEXT NOT NULL,   -- 'USD', 'JPY', etc.
    release_time TIMESTAMPTZ NOT NULL,
    impact_level TEXT NOT NULL CHECK (impact_level IN ('HIGH', 'MEDIUM', 'LOW')),
    forecast_val TEXT,
    previous_val TEXT,
    actual_val TEXT,
    unit TEXT,                -- '%', 'K', 'B', 'Index', etc.
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'RELEASED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_release_time ON public.events (release_time);
CREATE INDEX IF NOT EXISTS idx_events_impact_currency ON public.events (impact_level, currency);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);

-- ------------------------------------------------------------------------------
-- 3. Event Results (Post-release deviations, surprises & revisions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    actual_surprise TEXT, -- 'HOTTER', 'COOLER', 'IN_LINE', 'SUBSTANTIAL_SURPRISE'
    deviation_numeric NUMERIC(10, 4),
    revision_previous TEXT,
    release_delay_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_results_event_id ON public.event_results (event_id);

-- ------------------------------------------------------------------------------
-- 4. Price Data (OHLCV for XAUUSD & JPY pairs across M1, M5, M15, H1, D1)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair TEXT NOT NULL,       -- 'XAUUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDJPY'
    timeframe TEXT NOT NULL,  -- 'M1', 'M5', 'M15', 'H1', 'D1'
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC(15, 5) NOT NULL,
    high NUMERIC(15, 5) NOT NULL,
    low NUMERIC(15, 5) NOT NULL,
    close NUMERIC(15, 5) NOT NULL,
    volume NUMERIC(15, 2),
    UNIQUE (pair, timeframe, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_data_pair_tf_time ON public.price_data (pair, timeframe, timestamp DESC);

-- ------------------------------------------------------------------------------
-- 5. Reactions (Historical empirical moves after past releases)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    pair TEXT NOT NULL,
    move_1m_pips NUMERIC(10, 2),
    move_5m_pips NUMERIC(10, 2),
    move_15m_pips NUMERIC(10, 2),
    move_60m_pips NUMERIC(10, 2),
    spike_size_pips NUMERIC(10, 2),
    direction TEXT CHECK (direction IN ('UP', 'DOWN', 'NEUTRAL')),
    reversed_first_move BOOLEAN DEFAULT FALSE,
    reversal_time_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reactions_event_pair ON public.reactions (event_id, pair);

-- ------------------------------------------------------------------------------
-- 6. Market Snapshots (Point-in-time cross-asset condition preceding news)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    pair TEXT NOT NULL,
    snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    us_2y_yield NUMERIC(6, 4),
    us_10y_yield NUMERIC(6, 4),
    us_real_yield NUMERIC(6, 4),
    dxy NUMERIC(8, 4),
    jgb_yield NUMERIC(6, 4),
    us_jp_spread NUMERIC(6, 4),
    spx NUMERIC(10, 2),
    nasdaq NUMERIC(10, 2),
    vix NUMERIC(6, 2),
    oil_wti NUMERIC(6, 2),
    cot_gold_net NUMERIC(12, 2),
    cot_jpy_net NUMERIC(12, 2),
    technical_summary JSONB DEFAULT '{}'::jsonb,
    central_bank_tone JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_event_pair ON public.market_snapshots (event_id, pair);

-- ------------------------------------------------------------------------------
-- 7. Agent Runs (Execution sessions for the AI team)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    pair TEXT NOT NULL,
    trigger_type TEXT NOT NULL DEFAULT 'PRE_NEWS' CHECK (trigger_type IN ('PRE_NEWS', 'POST_NEWS', 'MANUAL')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd NUMERIC(8, 6) DEFAULT 0,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_event_pair ON public.agent_runs (event_id, pair);

-- ------------------------------------------------------------------------------
-- 8. Agent Outputs (Structured JSON results per agent)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL, -- e.g. 'fundamentals', 'central_bank', 'rates_yields', etc.
    bias TEXT NOT NULL CHECK (bias IN ('BULLISH', 'BEARISH', 'NEUTRAL', 'NO_TRADE')),
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    key_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    data_used JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_run_id ON public.agent_outputs (run_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_name ON public.agent_outputs (agent_name);

-- ------------------------------------------------------------------------------
-- 9. Scenarios (Pre-news 5-point outcome matrix)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    pair TEXT NOT NULL,
    scenario_key TEXT NOT NULL, -- 'MUCH_HOTTER', 'SLIGHTLY_HOTTER', 'IN_LINE', 'SLIGHTLY_COOLER', 'MUCH_COOLER'
    scenario_name TEXT NOT NULL,
    condition_description TEXT NOT NULL,
    probability_pct NUMERIC(5, 2) NOT NULL,
    expected_first_reaction TEXT NOT NULL,
    expected_follow_through TEXT NOT NULL,
    conditional_action TEXT NOT NULL, -- e.g. "If actual > 3.4% then SELL XAUUSD at market"
    invalidation_level NUMERIC(15, 5),
    risk_notes TEXT,
    expected_value_rating TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_event_pair ON public.scenarios (event_id, pair);

-- ------------------------------------------------------------------------------
-- 10. Signals (BUY / SELL / NO TRADE with pre-news entry points & take profits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    pair TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
    direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL', 'NO_TRADE')),
    confidence_pct INTEGER NOT NULL CHECK (confidence_pct BETWEEN 0 AND 100),
    timing TEXT NOT NULL CHECK (timing IN ('pre_news_limit', 'post_news_confirmation', 'wait')),
    suggested_entry NUMERIC(15, 5),
    entry_zone_min NUMERIC(15, 5),
    entry_zone_max NUMERIC(15, 5),
    stop_loss NUMERIC(15, 5),
    take_profit_1 NUMERIC(15, 5),
    take_profit_2 NUMERIC(15, 5),
    risk_reward_ratio NUMERIC(5, 2),
    position_size_lots NUMERIC(8, 2),
    key_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    dev_advocate_objections JSONB NOT NULL DEFAULT '[]'::jsonb,
    agreed_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
    disagreed_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONFIRMED', 'FLIPPED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_event_pair ON public.signals (event_id, pair);
CREATE INDEX IF NOT EXISTS idx_signals_user_id ON public.signals (user_id);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals (created_at DESC);

-- ------------------------------------------------------------------------------
-- 11. Signal Outcomes (Paper trade tracker & accuracy auditor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signal_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
    actual_entry_filled NUMERIC(15, 5),
    outcome_type TEXT CHECK (outcome_type IN ('WIN', 'LOSS', 'SCRATCH', 'EXPIRED', 'PENDING')),
    price_15m NUMERIC(15, 5),
    price_1h NUMERIC(15, 5),
    price_4h NUMERIC(15, 5),
    hit_tp1 BOOLEAN DEFAULT FALSE,
    hit_tp2 BOOLEAN DEFAULT FALSE,
    hit_sl BOOLEAN DEFAULT FALSE,
    max_favorable_excursion_pips NUMERIC(10, 2),
    max_adverse_excursion_pips NUMERIC(10, 2),
    r_multiple_achieved NUMERIC(6, 2),
    pnl_usd NUMERIC(12, 2),
    notes TEXT,
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signal_outcomes_signal_id ON public.signal_outcomes (signal_id);

-- ------------------------------------------------------------------------------
-- 12. Rules (User risk tolerance, execution filters & agent weights)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_key TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    rule_value JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_rules_user_id ON public.rules (user_id);

-- ------------------------------------------------------------------------------
-- 13. Watchlist (Active instruments and user alert settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pair TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    alert_before_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, pair)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist (user_id);

-- ------------------------------------------------------------------------------
-- 14. API Logs (Telemetry, rate-limiting, external service health)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INTEGER,
    latency_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    request_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_provider_created ON public.api_logs (provider, created_at DESC);

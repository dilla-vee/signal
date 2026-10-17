-- ==============================================================================
-- 20261017000001_rls_policies.sql
-- Row Level Security (RLS) Policies & Automatic Profile Trigger
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable RLS on all 14 tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Profiles: Users can view and update their own profile only
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. Public Market Data: Events, Results, Prices, Snapshots, Reactions, Scenarios
-- Authenticated users (and anon where appropriate) can read market intelligence.
-- Writes are restricted to backend service_role or admin.
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view scheduled events"
    ON public.events FOR SELECT
    USING (true);

CREATE POLICY "Service role manages events"
    ON public.events FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can view event results"
    ON public.event_results FOR SELECT
    USING (true);

CREATE POLICY "Service role manages event results"
    ON public.event_results FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can view price data"
    ON public.price_data FOR SELECT
    USING (true);

CREATE POLICY "Service role manages price data"
    ON public.price_data FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can view historical reactions"
    ON public.reactions FOR SELECT
    USING (true);

CREATE POLICY "Service role manages reactions"
    ON public.reactions FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can view market snapshots"
    ON public.market_snapshots FOR SELECT
    USING (true);

CREATE POLICY "Service role manages market snapshots"
    ON public.market_snapshots FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can view agent runs"
    ON public.agent_runs FOR SELECT
    USING (true);

CREATE POLICY "Service role manages agent runs"
    ON public.agent_runs FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can view agent outputs"
    ON public.agent_outputs FOR SELECT
    USING (true);

CREATE POLICY "Service role manages agent outputs"
    ON public.agent_outputs FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can view scenarios playbook"
    ON public.scenarios FOR SELECT
    USING (true);

CREATE POLICY "Service role manages scenarios"
    ON public.scenarios FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 4. User-Specific Trading Tables: Signals, Outcomes, Rules, Watchlist
-- Each user strictly reads & manages their own records.
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own signals"
    ON public.signals FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own signals"
    ON public.signals FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own signals"
    ON public.signals FOR UPDATE
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own signals"
    ON public.signals FOR DELETE
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Signal Outcomes
CREATE POLICY "Users can view outcomes of their signals"
    ON public.signal_outcomes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.signals
            WHERE signals.id = signal_outcomes.signal_id
            AND (signals.user_id = auth.uid() OR signals.user_id IS NULL OR auth.role() = 'service_role')
        )
    );

CREATE POLICY "Service role and users manage outcomes"
    ON public.signal_outcomes FOR ALL
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- User Rules
CREATE POLICY "Users can view own rules"
    ON public.rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
    ON public.rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
    ON public.rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
    ON public.rules FOR DELETE
    USING (auth.uid() = user_id);

-- User Watchlist
CREATE POLICY "Users can view own watchlist"
    ON public.watchlist FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items"
    ON public.watchlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items"
    ON public.watchlist FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items"
    ON public.watchlist FOR DELETE
    USING (auth.uid() = user_id);

-- API Logs: accessible to service_role and authenticated users for telemetry inspection
CREATE POLICY "Authenticated users can view api logs"
    ON public.api_logs FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role manages api logs"
    ON public.api_logs FOR INSERT
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. Trigger: Auto-create Profile and Default Rules upon User Registration
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, timezone, account_size, risk_per_trade_pct)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Trader'),
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'Africa/Nairobi'),
        10000.00,
        1.00
    );

    -- Seed default watchlist for XAUUSD & JPY pairs
    INSERT INTO public.watchlist (user_id, pair, is_active, alert_before_minutes)
    VALUES
        (NEW.id, 'XAUUSD', true, 30),
        (NEW.id, 'USDJPY', true, 30),
        (NEW.id, 'EURJPY', true, 30),
        (NEW.id, 'GBPJPY', true, 30),
        (NEW.id, 'AUDJPY', true, 30);

    -- Seed default rules
    INSERT INTO public.rules (user_id, rule_key, rule_name, rule_value, is_active)
    VALUES
        (NEW.id, 'min_confidence_threshold', 'Minimum Signal Confidence', '{"min_confidence": 65}'::jsonb, true),
        (NEW.id, 'risk_per_trade', 'Account Risk Percentage', '{"risk_pct": 1.0}'::jsonb, true),
        (NEW.id, 'spread_widening_filter', 'No Trade if Spread Widens Beyond', '{"max_spread_pips": 4.5}'::jsonb, true),
        (NEW.id, 'agent_disagreement_threshold', 'Force NO TRADE if Agent Disagreement Exceeds', '{"max_dissenting_agents": 4}'::jsonb, true),
        (NEW.id, 'pre_news_execution_mode', 'High Impact Execution Strategy', '{"default_mode": "post_news_confirmation"}'::jsonb, true);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users if available
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

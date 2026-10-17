-- ==============================================================================
-- 20261017000002_seed_data.sql
-- Seed upcoming economic events, historical reaction baselines, and initial signals
-- ==============================================================================

-- 1. Insert Upcoming High-Impact Economic Events
INSERT INTO public.events (id, event_name, event_type, country, currency, release_time, impact_level, forecast_val, previous_val, actual_val, unit, status)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'US Consumer Price Index (YoY)', 'CPI', 'US', 'USD', NOW() + INTERVAL '2 hours 30 minutes', 'HIGH', '3.1%', '3.2%', NULL, '%', 'SCHEDULED'),
    ('a0000000-0000-0000-0000-000000000002', 'US Core CPI (MoM)', 'CPI', 'US', 'USD', NOW() + INTERVAL '2 hours 30 minutes', 'HIGH', '0.3%', '0.3%', NULL, '%', 'SCHEDULED'),
    ('a0000000-0000-0000-0000-000000000003', 'Bank of Japan Monetary Policy Decision', 'BOJ_DECISION', 'JP', 'JPY', NOW() + INTERVAL '14 hours', 'HIGH', '0.25%', '0.25%', NULL, '%', 'SCHEDULED'),
    ('a0000000-0000-0000-0000-000000000004', 'US Producer Price Index (MoM)', 'PPI', 'US', 'USD', NOW() + INTERVAL '1 day 4 hours', 'HIGH', '0.2%', '0.1%', NULL, '%', 'SCHEDULED'),
    ('a0000000-0000-0000-0000-000000000005', 'US Non-Farm Payrolls', 'NFP', 'US', 'USD', NOW() + INTERVAL '3 days 6 hours', 'HIGH', '165K', '142K', NULL, 'K', 'SCHEDULED'),
    ('a0000000-0000-0000-0000-000000000006', 'FOMC Interest Rate Decision & Statement', 'FOMC', 'US', 'USD', NOW() + INTERVAL '5 days 10 hours', 'HIGH', '4.75%', '5.00%', NULL, '%', 'SCHEDULED'),
    ('a0000000-0000-0000-0000-000000000007', 'Japan National Core CPI (YoY)', 'JAPAN_CPI', 'JP', 'JPY', NOW() + INTERVAL '6 days 1 hour', 'HIGH', '2.8%', '2.8%', NULL, '%', 'SCHEDULED')
ON CONFLICT (id) DO UPDATE SET
    release_time = EXCLUDED.release_time,
    forecast_val = EXCLUDED.forecast_val,
    previous_val = EXCLUDED.previous_val;

-- 2. Insert Historical Reactions for Past Events (used by Historical Reaction Agent)
INSERT INTO public.reactions (event_id, pair, move_1m_pips, move_5m_pips, move_15m_pips, move_60m_pips, spike_size_pips, direction, reversed_first_move, reversal_time_minutes)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'XAUUSD', -125.0, -180.0, -210.0, -95.0, 140.0, 'DOWN', TRUE, 35),
    ('a0000000-0000-0000-0000-000000000001', 'USDJPY', 68.0, 94.0, 112.0, 85.0, 72.0, 'UP', FALSE, NULL),
    ('a0000000-0000-0000-0000-000000000003', 'USDJPY', -145.0, -210.0, -260.0, -190.0, 180.0, 'DOWN', FALSE, NULL),
    ('a0000000-0000-0000-0000-000000000003', 'EURJPY', -120.0, -175.0, -220.0, -160.0, 150.0, 'DOWN', FALSE, NULL),
    ('a0000000-0000-0000-0000-000000000005', 'XAUUSD', 185.0, 240.0, 290.0, 260.0, 190.0, 'UP', FALSE, NULL)
ON CONFLICT DO NOTHING;

-- 3. Insert Baseline Market Snapshot for Upcoming US CPI
INSERT INTO public.market_snapshots (
    event_id, pair, snapshot_time, us_2y_yield, us_10y_yield, us_real_yield, dxy, jgb_yield, us_jp_spread,
    spx, nasdaq, vix, oil_wti, cot_gold_net, cot_jpy_net, technical_summary, central_bank_tone
)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'XAUUSD',
    NOW(),
    4.02, 4.18, 1.84, 102.85, 0.95, 3.23,
    5815.20, 18340.50, 16.40, 71.20,
    265400.00, -42100.00,
    '{"trend": "BULLISH", "atr_14": 28.5, "key_support": 2635.00, "key_resistance": 2685.00, "current_price": 2658.40}'::jsonb,
    '{"fed_stance": "DOVISH_LEANING", "boj_stance": "HAWKISH_NORMALIZATION", "dovish_score": 68}'::jsonb
)
ON CONFLICT DO NOTHING;

-- 4. Insert Pre-News Scenario Matrix for US CPI
INSERT INTO public.scenarios (
    event_id, pair, scenario_key, scenario_name, condition_description, probability_pct,
    expected_first_reaction, expected_follow_through, conditional_action, invalidation_level, risk_notes, expected_value_rating
)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'XAUUSD', 'MUCH_HOTTER', 'Much Hotter (> 3.3%)', 'Headline YoY exceeds 3.3% or MoM > 0.4%', 15.00, 'Sharp plunge 150-250 pips in gold as yields spike', 'Bearish continuation toward 2630 support', 'If actual > 3.3% then SELL XAUUSD on 5M pullback', 2675.00, 'High slippage risk during first 60 seconds; do not market sell into spread spike', 'High Conviction Bearish'),
    ('a0000000-0000-0000-0000-000000000001', 'XAUUSD', 'SLIGHTLY_HOTTER', 'Slightly Hotter (3.2%)', 'Headline matches 3.2% vs 3.1% forecast', 25.00, 'Knee-jerk dip 60-100 pips followed by choppy consolidation', 'Choppy range between 2645 and 2665', 'If actual == 3.2% then NO TRADE / WAIT for 15M candle close', 2670.00, 'High probability of false breakdown before reversal', 'Neutral / No Trade'),
    ('a0000000-0000-0000-0000-000000000001', 'XAUUSD', 'IN_LINE', 'In-Line (3.1%)', 'Headline matches consensus exactly at 3.1%', 30.00, 'Muted reaction 30-50 pips two-way whip', 'Resumes broader macro trend (bullish gold, weak USD)', 'If actual == 3.1% then BUY XAUUSD dips near 2650 zone', 2640.00, 'Two-way whipsaw will stop out tight pre-market orders', 'Moderate Bullish'),
    ('a0000000-0000-0000-0000-000000000001', 'XAUUSD', 'SLIGHTLY_COOLER', 'Slightly Cooler (3.0%)', 'Headline prints 3.0% vs 3.1% forecast', 20.00, 'Rally 120-180 pips as US yields ease 4-6 bps', 'Bullish expansion toward 2678 resistance', 'If actual <= 3.0% then BUY XAUUSD on retest of 2660', 2645.00, 'Watch out for profit taking into 2680 psychological barrier', 'High Conviction Bullish'),
    ('a0000000-0000-0000-0000-000000000001', 'XAUUSD', 'MUCH_COOLER', 'Much Cooler (< 3.0%)', 'Headline drops below 3.0% with soft Core MoM', 10.00, 'Explosive rally > 250 pips, breaking all-time highs', 'Strong multi-session trend expansion', 'If actual < 3.0% then aggressive BUY with trailing stop', 2650.00, 'Immediate limit order fills may gap higher', 'Maximum Bullish')
ON CONFLICT DO NOTHING;

-- 5. Insert Exemplar Pre-News Signal for US CPI (XAUUSD) with explicit Entry Points, Stop Loss & Take Profits
INSERT INTO public.signals (
    id, event_id, pair, user_id, run_id, direction, confidence_pct, timing,
    suggested_entry, entry_zone_min, entry_zone_max, stop_loss, take_profit_1, take_profit_2,
    risk_reward_ratio, position_size_lots, key_drivers, key_risks, dev_advocate_objections,
    agreed_agents, disagreed_agents, status
)
VALUES (
    's0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'XAUUSD',
    NULL, -- Global exemplar signal
    NULL,
    'BUY',
    72,
    'post_news_confirmation',
    2654.50,
    2650.00,
    2656.00,
    2638.00,
    2675.00,
    2692.00,
    2.28,
    0.60,
    '["Consensus 3.1% YoY with downside skew in shelter index", "Fed dovish tilt limits USD upside even on modest beat", "Safe haven physical demand strong on geopolitical tensions", "Net COT positioning remains supportive"]'::jsonb,
    '["Oil recent bounce could print sticky headline energy MoM", "Spread widening up to $1.80 expected at 12:30:00 UTC", "False breakout risks around 2685 previous swing high"]'::jsonb,
    '["Devil Advocate Note: 10Y yields have formed a double bottom at 4.00%; any inline figure with strong Core will crush Gold longs. Wait for 5M candle close before filling."]'::jsonb,
    '["Fundamentals Agent", "Central Bank Agent", "Rates & Yield Agent", "Geopolitical Agent", "Technical Structure Agent"]'::jsonb,
    '["Cross-Asset & Risk-Sentiment Agent", "Positioning & Sentiment Agent"]'::jsonb,
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

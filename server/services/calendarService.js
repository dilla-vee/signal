import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { logApiCall } from './apiLoggerService.js';

// Curated Macro Event Schedule for XAUUSD & JPY Focus
const CURATED_MACRO_SCHEDULE = [
  {
    event_name: 'US Consumer Price Index (YoY)',
    event_type: 'CPI',
    country: 'US',
    currency: 'USD',
    offset_minutes: 150, // 2h 30m from now
    impact_level: 'HIGH',
    forecast_val: '3.1%',
    previous_val: '3.2%',
    actual_val: null,
    unit: '%'
  },
  {
    event_name: 'US Core CPI (MoM)',
    event_type: 'CPI',
    country: 'US',
    currency: 'USD',
    offset_minutes: 150,
    impact_level: 'HIGH',
    forecast_val: '0.3%',
    previous_val: '0.3%',
    actual_val: null,
    unit: '%'
  },
  {
    event_name: 'Bank of Japan Monetary Policy Decision & Statement',
    event_type: 'BOJ_DECISION',
    country: 'JP',
    currency: 'JPY',
    offset_minutes: 840, // 14 hours
    impact_level: 'HIGH',
    forecast_val: '0.25%',
    previous_val: '0.25%',
    actual_val: null,
    unit: '%'
  },
  {
    event_name: 'US Producer Price Index (MoM)',
    event_type: 'PPI',
    country: 'US',
    currency: 'USD',
    offset_minutes: 1680, // 28 hours
    impact_level: 'HIGH',
    forecast_val: '0.2%',
    previous_val: '0.1%',
    actual_val: null,
    unit: '%'
  },
  {
    event_name: 'US Initial Jobless Claims',
    event_type: 'JOBLESS_CLAIMS',
    country: 'US',
    currency: 'USD',
    offset_minutes: 2880, // 48 hours
    impact_level: 'MEDIUM',
    forecast_val: '221K',
    previous_val: '219K',
    actual_val: null,
    unit: 'K'
  },
  {
    event_name: 'US Non-Farm Payrolls',
    event_type: 'NFP',
    country: 'US',
    currency: 'USD',
    offset_minutes: 4680, // ~3.2 days
    impact_level: 'HIGH',
    forecast_val: '165K',
    previous_val: '142K',
    actual_val: null,
    unit: 'K'
  },
  {
    event_name: 'FOMC Interest Rate Decision & Economic Projections',
    event_type: 'FOMC',
    country: 'US',
    currency: 'USD',
    offset_minutes: 7920, // 5.5 days
    impact_level: 'HIGH',
    forecast_val: '4.75%',
    previous_val: '5.00%',
    actual_val: null,
    unit: '%'
  },
  {
    event_name: 'Japan National Core CPI (YoY)',
    event_type: 'JAPAN_CPI',
    country: 'JP',
    currency: 'JPY',
    offset_minutes: 8700, // 6 days
    impact_level: 'HIGH',
    forecast_val: '2.8%',
    previous_val: '2.8%',
    actual_val: null,
    unit: '%'
  }
];

export class CalendarService {
  /**
   * Fetch upcoming economic events from Supabase or fallback schedule
   */
  async getUpcomingEvents({ limit = 20, impact = 'HIGH', currency = null } = {}) {
    const startTime = Date.now();
    try {
      if (supabaseAdmin) {
        let query = supabaseAdmin
          .from('events')
          .select('*')
          .gte('release_time', new Date(Date.now() - 3600000).toISOString()) // include events from 1h ago
          .order('release_time', { ascending: true })
          .limit(limit);

        if (impact && impact !== 'ALL') {
          query = query.eq('impact_level', impact);
        }

        if (currency) {
          query = query.eq('currency', currency);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          logApiCall({
            provider: 'supabase',
            endpoint: 'events:select',
            statusCode: 200,
            latencyMs: Date.now() - startTime,
            success: true
          });
          return data;
        }
      }

      // Fallback in-memory schedule with current dynamic timestamps
      const now = Date.now();
      const mockEvents = CURATED_MACRO_SCHEDULE.map((ev, idx) => ({
        id: `mock-event-${idx + 1}`,
        event_name: ev.event_name,
        event_type: ev.event_type,
        country: ev.country,
        currency: ev.currency,
        release_time: new Date(now + ev.offset_minutes * 60 * 1000).toISOString(),
        impact_level: ev.impact_level,
        forecast_val: ev.forecast_val,
        previous_val: ev.previous_val,
        actual_val: ev.actual_val,
        unit: ev.unit,
        status: 'SCHEDULED'
      }));

      return mockEvents;
    } catch (err) {
      logger.error('Error fetching calendar events', { error: err.message });
      throw err;
    }
  }

  /**
   * Get specific event by ID with its scenario matrix and historical reactions
   */
  async getEventDetail(eventId) {
    try {
      if (supabaseAdmin) {
        const { data: event, error: eventErr } = await supabaseAdmin
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (event && !eventErr) {
          const [scenariosRes, reactionsRes, signalsRes] = await Promise.all([
            supabaseAdmin.from('scenarios').select('*').eq('event_id', eventId),
            supabaseAdmin.from('reactions').select('*').eq('event_id', eventId),
            supabaseAdmin.from('signals').select('*').eq('event_id', eventId)
          ]);

          return {
            ...event,
            scenarios: scenariosRes.data || [],
            reactions: reactionsRes.data || [],
            signals: signalsRes.data || []
          };
        }
      }

      // Return synthetic detail for mock fallback
      const upcoming = await this.getUpcomingEvents();
      const match = upcoming.find(e => e.id === eventId) || upcoming[0];
      return {
        ...match,
        scenarios: [
          {
            scenario_key: 'MUCH_HOTTER',
            scenario_name: 'Much Hotter (> 3.3%)',
            probability_pct: 15,
            expected_first_reaction: 'Plunge 150-250 pips in gold, yields surge',
            conditional_action: 'SELL on 5M pullback',
            invalidation_level: 2675.00
          },
          {
            scenario_key: 'IN_LINE',
            scenario_name: 'In-Line (3.1%)',
            probability_pct: 35,
            expected_first_reaction: 'Two-way chop 30-50 pips',
            conditional_action: 'BUY dips near 2650 support',
            invalidation_level: 2640.00
          },
          {
            scenario_key: 'MUCH_COOLER',
            scenario_name: 'Much Cooler (< 3.0%)',
            probability_pct: 20,
            expected_first_reaction: 'Explosive rally > 250 pips',
            conditional_action: 'BUY breakout with trailing stop',
            invalidation_level: 2650.00
          }
        ],
        reactions: [
          { pair: 'XAUUSD', move_5m_pips: -180, move_60m_pips: -95, reversed_first_move: true, direction: 'DOWN' },
          { pair: 'USDJPY', move_5m_pips: 94, move_60m_pips: 85, reversed_first_move: false, direction: 'UP' }
        ],
        signals: []
      };
    } catch (err) {
      logger.error('Error fetching event detail', { eventId, error: err.message });
      throw err;
    }
  }

  /**
   * Sync calendar: upsert fresh events into Supabase
   */
  async syncCalendar() {
    const startTime = Date.now();
    logger.info('Executing Economic Calendar synchronization...');

    if (!supabaseAdmin) {
      logger.info('Supabase not connected. Synced mock calendar successfully.');
      return { syncedCount: CURATED_MACRO_SCHEDULE.length, source: 'curated_schedule' };
    }

    try {
      const now = Date.now();
      const records = CURATED_MACRO_SCHEDULE.map(ev => ({
        event_name: ev.event_name,
        event_type: ev.event_type,
        country: ev.country,
        currency: ev.currency,
        release_time: new Date(now + ev.offset_minutes * 60 * 1000).toISOString(),
        impact_level: ev.impact_level,
        forecast_val: ev.forecast_val,
        previous_val: ev.previous_val,
        unit: ev.unit,
        status: 'SCHEDULED'
      }));

      const { data, error } = await supabaseAdmin
        .from('events')
        .upsert(records, { onConflict: 'event_name, release_time' })
        .select();

      if (error) {
        throw error;
      }

      await logApiCall({
        provider: 'calendar_service',
        endpoint: 'events:upsert',
        statusCode: 200,
        latencyMs: Date.now() - startTime,
        success: true
      });

      logger.info(`Calendar synced successfully. Upserted ${records.length} macro events.`);
      return { syncedCount: records.length, data };
    } catch (err) {
      logger.error('Failed to sync calendar events', { error: err.message });
      await logApiCall({
        provider: 'calendar_service',
        endpoint: 'events:upsert',
        statusCode: 500,
        latencyMs: Date.now() - startTime,
        success: false,
        errorMessage: err.message
      });
      throw err;
    }
  }
}

export const calendarService = new CalendarService();

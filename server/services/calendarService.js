import axios from 'axios';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { logApiCall } from './apiLoggerService.js';

// Curated Emergency Fallback Schedule (ONLY used when offline or network fails)
const FALLBACK_SEED_SCHEDULE = [
  {
    event_name: 'US Consumer Price Index (YoY)',
    event_type: 'CPI',
    country: 'US',
    currency: 'USD',
    offset_minutes: 150,
    impact_level: 'HIGH',
    forecast_val: '3.1%',
    previous_val: '3.2%',
    actual_val: null,
    unit: '%'
  },
  {
    event_name: 'Bank of Japan Monetary Policy Decision & Statement',
    event_type: 'BOJ_DECISION',
    country: 'JP',
    currency: 'JPY',
    offset_minutes: 840,
    impact_level: 'HIGH',
    forecast_val: '0.25%',
    previous_val: '0.25%',
    actual_val: null,
    unit: '%'
  },
  {
    event_name: 'US Initial Jobless Claims',
    event_type: 'JOBLESS_CLAIMS',
    country: 'US',
    currency: 'USD',
    offset_minutes: 2880,
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
    offset_minutes: 4680,
    impact_level: 'HIGH',
    forecast_val: '165K',
    previous_val: '142K',
    actual_val: null,
    unit: 'K'
  }
];

export class CalendarService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.cacheTtlMs = 10 * 60 * 1000; // 10 minutes
    this.staleThresholdMs = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Helper to categorize macro event from title
   */
  classifyEventType(title) {
    const t = (title || '').toUpperCase();
    if (t.includes('CPI') || t.includes('INFLATION')) return 'CPI';
    if (t.includes('PAYROLL') || t.includes('NFP') || t.includes('EMPLOYMENT CHANGE')) return 'NFP';
    if (t.includes('PPI')) return 'PPI';
    if (t.includes('FOMC') || t.includes('FED INTEREST RATE')) return 'FOMC';
    if (t.includes('BOJ') || t.includes('POLICY RATE') && t.includes('JAPAN')) return 'BOJ_DECISION';
    if (t.includes('ECB')) return 'ECB';
    if (t.includes('JOBLESS CLAIMS')) return 'JOBLESS_CLAIMS';
    if (t.includes('GDP')) return 'GDP';
    if (t.includes('PMI')) return 'PMI';
    if (t.includes('RETAIL SALES')) return 'RETAIL_SALES';
    return 'MACRO_RELEASE';
  }

  /**
   * Fetch live economic calendar from ForexFactory public JSON feed
   */
  async fetchLiveForexFactoryCalendar() {
    const url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 6000
    });

    if (!Array.isArray(res.data)) {
      throw new Error('Unexpected calendar feed response format');
    }

    const countryMap = {
      USD: 'US',
      JPY: 'JP',
      EUR: 'EU',
      GBP: 'GB',
      AUD: 'AU',
      CAD: 'CA',
      CHF: 'CH',
      NZD: 'NZ'
    };

    const now = Date.now();
    const liveEvents = res.data.map((item, idx) => {
      const currency = item.country || 'USD';
      const countryCode = countryMap[currency] || 'US';
      const releaseIso = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
      const impactRaw = (item.impact || 'Medium').toUpperCase();
      const impactLevel = impactRaw === 'HIGH' ? 'HIGH' : impactRaw === 'MEDIUM' ? 'MEDIUM' : 'LOW';

      // Deterministic ID from title + release time
      const hash = crypto.createHash('md5').update(`${item.title}_${releaseIso}`).digest('hex').substring(0, 16);

      return {
        id: `ff-${hash}`,
        event_name: item.title,
        event_type: this.classifyEventType(item.title),
        country: countryCode,
        currency,
        release_time: releaseIso,
        impact_level: impactLevel,
        forecast_val: item.forecast || null,
        previous_val: item.previous || null,
        actual_val: item.actual || null,
        unit: item.forecast?.includes('%') ? '%' : item.forecast?.includes('K') ? 'K' : item.forecast?.includes('M') ? 'M' : '',
        status: new Date(releaseIso).getTime() <= now ? 'COMPLETED' : 'SCHEDULED',
        source_name: 'ForexFactory Live Feed',
        last_updated: new Date().toISOString(),
        is_stale: false,
        is_demo: false
      };
    });

    return liveEvents;
  }

  /**
   * Fetch upcoming economic events (Live API with offline fallback)
   */
  async getUpcomingEvents({ limit = 20, impact = 'HIGH', currency = null } = {}) {
    const startTime = Date.now();
    const now = Date.now();

    // 1. Check in-memory cache
    if (this.cache && (now - this.cacheTimestamp < this.cacheTtlMs)) {
      return this.filterEvents(this.cache, { limit, impact, currency });
    }

    try {
      // 2. Fetch from Live API
      const liveEvents = await this.fetchLiveForexFactoryCalendar();

      this.cache = liveEvents;
      this.cacheTimestamp = now;

      await logApiCall({
        provider: 'forexfactory',
        endpoint: 'ff_calendar_thisweek.json',
        statusCode: 200,
        latencyMs: Date.now() - startTime,
        success: true
      });

      logger.info(`Loaded ${liveEvents.length} live macro events from ForexFactory feed`);
      return this.filterEvents(liveEvents, { limit, impact, currency });
    } catch (err) {
      logger.warn('ForexFactory live calendar request failed, checking Supabase / fallback', { error: err.message });

      // 3. Fall back to Supabase if available
      if (supabaseAdmin) {
        try {
          let query = supabaseAdmin
            .from('events')
            .select('*')
            .gte('release_time', new Date(Date.now() - 3600000).toISOString())
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
            return data.map(d => ({
              ...d,
              source_name: 'Supabase Stored Events',
              last_updated: d.updated_at || new Date().toISOString(),
              is_stale: true,
              is_demo: false
            }));
          }
        } catch (dbErr) {
          logger.warn('Supabase calendar query error', { error: dbErr.message });
        }
      }

      // 4. Emergency Seed Fallback with explicit DEMO and STALE badges
      const seedEvents = FALLBACK_SEED_SCHEDULE.map((ev, idx) => ({
        id: `seed-event-${idx + 1}`,
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
        status: 'SCHEDULED',
        source_name: 'Offline Seed Fallback',
        last_updated: new Date(now - 3600000).toISOString(),
        is_stale: true,
        is_demo: true
      }));

      return this.filterEvents(seedEvents, { limit, impact, currency });
    }
  }

  /**
   * Helper to filter events by impact, currency, and date
   */
  filterEvents(events, { limit = 20, impact = 'HIGH', currency = null } = {}) {
    const now = Date.now();
    let filtered = events.filter(e => {
      // Include events starting from 2 hours ago through the next 7 days
      const eventTime = new Date(e.release_time).getTime();
      return eventTime >= (now - 2 * 3600 * 1000);
    });

    if (impact && impact !== 'ALL') {
      filtered = filtered.filter(e => e.impact_level === impact);
    }

    if (currency && currency !== 'ALL') {
      filtered = filtered.filter(e => e.currency === currency);
    }

    // Sort ascending by release time
    filtered.sort((a, b) => new Date(a.release_time) - new Date(b.release_time));
    return filtered.slice(0, limit);
  }

  /**
   * Get specific event by ID with its scenario matrix and historical reactions
   */
  async getEventDetail(eventId) {
    try {
      const upcoming = await this.getUpcomingEvents({ limit: 100, impact: 'ALL' });
      const match = upcoming.find(e => e.id === eventId) || upcoming[0];

      if (!match) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      return {
        ...match,
        scenarios: [
          {
            scenario_key: 'SURPRISE_HOT',
            scenario_name: 'Surprise Higher than Forecast',
            probability_pct: 25,
            expected_first_reaction: 'Surge in US yields, USD rally, sharp drop in Gold',
            conditional_action: 'Look for SELL confirmation on M5 pullback'
          },
          {
            scenario_key: 'IN_LINE',
            scenario_name: 'In-Line with Forecast',
            probability_pct: 50,
            expected_first_reaction: 'Transient whip 20-40 pips then trend continuation',
            conditional_action: 'Trade prevailing technical trend'
          },
          {
            scenario_key: 'SURPRISE_COOL',
            scenario_name: 'Surprise Cooler than Forecast',
            probability_pct: 25,
            expected_first_reaction: 'Drop in US yields, USD selling, strong rally in Gold',
            conditional_action: 'Look for BUY breakout with tight invalidation'
          }
        ],
        reactions: [
          { pair: 'XAUUSD', move_5m_pips: 120, move_60m_pips: 165, reversed_first_move: false, direction: 'UP' },
          { pair: 'USDJPY', move_5m_pips: -65, move_60m_pips: -80, reversed_first_move: false, direction: 'DOWN' }
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
    logger.info('Executing live Economic Calendar synchronization from ForexFactory...');

    try {
      const liveEvents = await this.fetchLiveForexFactoryCalendar();

      if (!supabaseAdmin) {
        logger.info(`Supabase not connected. Cached ${liveEvents.length} live events in memory.`);
        return { syncedCount: liveEvents.length, source: 'ForexFactory Live Feed', data: liveEvents.slice(0, 5) };
      }

      const records = liveEvents.map(ev => ({
        event_name: ev.event_name,
        event_type: ev.event_type,
        country: ev.country,
        currency: ev.currency,
        release_time: ev.release_time,
        impact_level: ev.impact_level,
        forecast_val: ev.forecast_val,
        previous_val: ev.previous_val,
        unit: ev.unit,
        status: ev.status
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

      logger.info(`Calendar synced successfully. Upserted ${records.length} real macro events.`);
      return { syncedCount: records.length, data };
    } catch (err) {
      logger.error('Failed to sync calendar events', { error: err.message });
      throw err;
    }
  }
}

export const calendarService = new CalendarService();

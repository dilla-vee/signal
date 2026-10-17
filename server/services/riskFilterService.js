import { calendarService } from './calendarService.js';
import { logger } from '../utils/logger.js';

export class RiskFilterService {
  /**
   * Evaluates upcoming economic events and computes active and imminent no-trade windows
   */
  async getNoTradeWindows({ preMinutes = 15, postMinutes = 15 } = {}) {
    try {
      const events = await calendarService.getUpcomingEvents({ limit: 15, impact: 'HIGH' });
      const now = Date.now();

      return events.map(e => {
        const releaseMs = new Date(e.release_time).getTime();
        const startMs = releaseMs - (preMinutes * 60 * 1000);
        const endMs = releaseMs + (postMinutes * 60 * 1000);

        let windowStatus = 'CLEAR';
        if (now >= startMs && now <= endMs) {
          windowStatus = 'IN_LOCKDOWN';
        } else if (now < startMs && (startMs - now) <= (45 * 60 * 1000)) {
          windowStatus = 'APPROACHING';
        }

        const countdownSeconds = Math.max(0, Math.floor((releaseMs - now) / 1000));

        return {
          event_id: e.id,
          event_name: e.event_name,
          currency: e.currency,
          impact: e.impact_level,
          forecast_val: e.forecast_val,
          previous_val: e.previous_val,
          release_time_utc: e.release_time,
          no_trade_start_utc: new Date(startMs).toISOString(),
          no_trade_end_utc: new Date(endMs).toISOString(),
          window_status: windowStatus,
          countdown_seconds: countdownSeconds,
          pre_news_buffer_mins: preMinutes,
          post_news_buffer_mins: postMinutes,
          max_spread_allowed_pips: e.currency === 'USD' ? 4.5 : 5.0
        };
      });
    } catch (err) {
      logger.error('Failed to get no-trade windows', { error: err.message });
      throw err;
    }
  }

  /**
   * Expected spread widening matrix under high-impact news conditions
   */
  getSpreadWideningMatrix() {
    return [
      {
        pair: 'XAUUSD',
        displayName: 'Gold (XAUUSD)',
        normalSpread: '$0.20 - $0.35',
        newsSpikeSpread: '$1.80 - $3.80',
        newsSpikePips: '18 - 38 pips',
        riskTier: 'EXTREME',
        maxAllowedSpread: '$2.50',
        advisory: 'Spread expansion of 8-12x. Do not place tight retail stops (<$5.00) before release.'
      },
      {
        pair: 'USDJPY',
        displayName: 'USD/JPY',
        normalSpread: '0.7 - 1.0 pips',
        newsSpikeSpread: '4.5 - 8.5 pips',
        newsSpikePips: '5 - 9 pips',
        riskTier: 'HIGH',
        maxAllowedSpread: '5.0 pips',
        advisory: 'High initial slippage. Limit orders only or wait for 5-minute stabilization.'
      },
      {
        pair: 'EURJPY',
        displayName: 'EUR/JPY',
        normalSpread: '1.2 - 1.6 pips',
        newsSpikeSpread: '6.0 - 11.0 pips',
        newsSpikePips: '6 - 11 pips',
        riskTier: 'HIGH',
        maxAllowedSpread: '6.5 pips',
        advisory: 'Cross-rate liquidity vanishes for 30-45 seconds post-release.'
      },
      {
        pair: 'GBPJPY',
        displayName: 'GBP/JPY (Dragon)',
        normalSpread: '1.5 - 2.2 pips',
        newsSpikeSpread: '8.0 - 15.0 pips',
        newsSpikePips: '8 - 15 pips',
        riskTier: 'EXTREME',
        maxAllowedSpread: '8.0 pips',
        advisory: 'Violent two-way whipsaws. Automated scalp EAs must be suspended.'
      },
      {
        pair: 'AUDJPY',
        displayName: 'AUD/JPY',
        normalSpread: '1.4 - 2.0 pips',
        newsSpikeSpread: '6.5 - 12.0 pips',
        newsSpikePips: '7 - 12 pips',
        riskTier: 'HIGH',
        maxAllowedSpread: '6.5 pips',
        advisory: 'Carry trade liquidation risk on unexpected BoJ or US CPI releases.'
      }
    ];
  }

  /**
   * Generates formatted export for MetaTrader 5 Expert Advisors (JSON or CSV)
   */
  async generateMt5Export({ format = 'json', preMinutes = 15, postMinutes = 15 } = {}) {
    const windows = await this.getNoTradeWindows({ preMinutes, postMinutes });

    if (format === 'csv') {
      const headers = 'event_id,event_name,currency,impact,release_time_utc,no_trade_start_utc,no_trade_end_utc,max_spread_allowed_pips\n';
      const rows = windows.map(w =>
        `"${w.event_id}","${w.event_name.replace(/"/g, '""')}","${w.currency}","${w.impact}","${w.release_time_utc}","${w.no_trade_start_utc}","${w.no_trade_end_utc}",${w.max_spread_allowed_pips}`
      ).join('\n');

      return {
        format: 'csv',
        filename: `mt5_news_filter_${Date.now()}.csv`,
        contentType: 'text/csv',
        content: headers + rows
      };
    }

    return {
      format: 'json',
      filename: `mt5_news_filter_${Date.now()}.json`,
      contentType: 'application/json',
      content: JSON.stringify(windows, null, 2),
      data: windows
    };
  }
}

export const riskFilterService = new RiskFilterService();

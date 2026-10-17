import crypto from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

// In-memory cache for mock testing when Supabase is not configured
export const localSignalStore = new Map();

export class PostReleaseService {
  /**
   * Evaluates incoming actual economic release against the pre-news scenario matrix
   * and updates signal status to CONFIRMED, FLIPPED, or CANCELLED.
   */
  async evaluateRelease({
    signalId,
    actualValue,
    currentPrice = null,
    eventForecast = null,
    scenarioMatrix = []
  }) {
    logger.info(`[Post-Release Service] Evaluating release for Signal ${signalId}...`);

    // 1. Retrieve original signal
    let signal = null;
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('signals')
        .select('*')
        .eq('id', signalId)
        .single();

      if (!error && data) {
        signal = data;
      }
    }

    if (!signal) {
      signal = localSignalStore.get(signalId);
    }

    if (!signal) {
      // Mock signal baseline if not found
      signal = {
        id: signalId || 'mock-signal-1',
        pair: 'XAUUSD',
        direction: 'BUY',
        suggested_entry: 2650.00,
        stop_loss: 2635.00,
        take_profit_1: 2680.00,
        confidence_pct: 74,
        status: 'ACTIVE'
      };
    }

    const pair = signal.pair || 'XAUUSD';
    const isGold = pair === 'XAUUSD';
    const originalDirection = signal.direction;
    const entryPrice = Number(signal.suggested_entry) || (isGold ? 2650.00 : 150.00);
    const stopLoss = Number(signal.stop_loss);
    const effectivePrice = currentPrice !== null ? Number(currentPrice) : entryPrice;

    // 2. Parse surprise delta (actual vs forecast)
    const numActual = typeof actualValue === 'number' ? actualValue : parseFloat(String(actualValue).replace(/[^0-9.-]/g, ''));
    const numForecast = eventForecast !== null
      ? (typeof eventForecast === 'number' ? eventForecast : parseFloat(String(eventForecast).replace(/[^0-9.-]/g, '')))
      : 3.1;

    const surpriseDelta = Math.round((numActual - numForecast) * 100) / 100;

    // 3. Match against scenario category
    let triggeredScenarioKey = 'IN_LINE';
    if (surpriseDelta >= 0.3) triggeredScenarioKey = 'MUCH_HOTTER';
    else if (surpriseDelta >= 0.1) triggeredScenarioKey = 'SLIGHTLY_HOTTER';
    else if (surpriseDelta <= -0.3) triggeredScenarioKey = 'MUCH_COOLER';
    else if (surpriseDelta <= -0.1) triggeredScenarioKey = 'SLIGHTLY_COOLER';
    else triggeredScenarioKey = 'IN_LINE';

    // 4. Determine Post-Release Status
    // For Gold: Cooler prints are BULLISH (BUY), Hotter prints are BEARISH (SELL)
    // For USDJPY: Hotter prints are BULLISH (BUY), Cooler prints are BEARISH (SELL)
    let outcomeStatus = 'CONFIRMED';
    let postReleaseAction = '';
    let postReleaseNotes = '';

    const priceMovedInFavor = originalDirection === 'BUY'
      ? (effectivePrice >= entryPrice)
      : (effectivePrice <= entryPrice);

    const hitStopLoss = originalDirection === 'BUY'
      ? (effectivePrice <= stopLoss)
      : (effectivePrice >= stopLoss);

    // If stop loss is breached, immediately flip or cancel
    if (hitStopLoss) {
      outcomeStatus = 'CANCELLED';
      postReleaseAction = 'EXIT_IMMEDIATELY_STOP_BREACHED';
      postReleaseNotes = `Price breached stop loss (${stopLoss}) during post-release spike. Invalidation executed.`;
    } else if (triggeredScenarioKey === 'IN_LINE') {
      outcomeStatus = 'CANCELLED';
      postReleaseAction = 'SCRATCH_OR_CANCEL';
      postReleaseNotes = `Actual print (${numActual}) printed in line with forecast (${numForecast}). Lack of macro catalyst and spread widening warrant immediate scratch.`;
    } else {
      // Check alignment between expected macro effect and original trade direction
      let macroFavorsBuy = isGold ? (surpriseDelta < 0) : (surpriseDelta > 0);

      if ((originalDirection === 'BUY' && macroFavorsBuy) || (originalDirection === 'SELL' && !macroFavorsBuy)) {
        // Aligned
        outcomeStatus = 'CONFIRMED';
        postReleaseAction = 'TRAIL_STOP_TO_BREAKEVEN';
        postReleaseNotes = `Actual (${numActual}) validated the thesis (Surprise: ${surpriseDelta > 0 ? '+' : ''}${surpriseDelta}). Scenario triggered: ${triggeredScenarioKey}. Move stop to breakeven ($${entryPrice}) and ride toward TP1 ($${signal.take_profit_1}).`;
      } else {
        // Conflicting surprise
        outcomeStatus = 'FLIPPED';
        postReleaseAction = originalDirection === 'BUY' ? 'FLIP_TO_SELL' : 'FLIP_TO_BUY';
        postReleaseNotes = `Macro surprise (${surpriseDelta > 0 ? '+' : ''}${surpriseDelta}) violently contradicted pre-news bias. Triggered opposite scenario: ${triggeredScenarioKey}. Recommended action: Cut position or flip direction.`;
      }
    }

    const updatedSignal = {
      ...signal,
      status: outcomeStatus,
      post_release_status: outcomeStatus,
      post_release_action: postReleaseAction,
      post_release_notes: postReleaseNotes,
      actual_surprise: surpriseDelta,
      actual_value: numActual,
      post_release_price: effectivePrice,
      updated_at: new Date().toISOString()
    };

    // Update in local store
    localSignalStore.set(signal.id, updatedSignal);

    // Update in Supabase if available
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('signals')
        .update({
          status: outcomeStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', signal.id);

      // Record in signal_outcomes
      await supabaseAdmin.from('signal_outcomes').insert({
        id: crypto.randomUUID(),
        signal_id: signal.id,
        actual_entry_filled: entryPrice,
        outcome_type: outcomeStatus === 'CONFIRMED' ? 'WIN' : (outcomeStatus === 'FLIPPED' ? 'LOSS' : 'SCRATCH'),
        price_15m: effectivePrice,
        notes: postReleaseNotes,
        closed_at: outcomeStatus !== 'CONFIRMED' ? new Date().toISOString() : null
      });
    }

    logger.info(`[Post-Release Service] Signal ${signal.id} evaluated as ${outcomeStatus} (Action: ${postReleaseAction})`);

    return updatedSignal;
  }
}

export const postReleaseService = new PostReleaseService();

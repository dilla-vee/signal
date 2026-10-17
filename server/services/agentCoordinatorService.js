import crypto from 'node:crypto';
import { fundamentalsAgent } from '../agents/fundamentalsAgent.js';
import { centralBankAgent } from '../agents/centralBankAgent.js';
import { ratesYieldAgent } from '../agents/ratesYieldAgent.js';
import { crossAssetAgent } from '../agents/crossAssetAgent.js';
import { technicalAgent } from '../agents/technicalAgent.js';
import { positioningAgent } from '../agents/positioningAgent.js';
import { geopoliticalAgent } from '../agents/geopoliticalAgent.js';
import { historicalReactionAgent } from '../agents/historicalReactionAgent.js';
import { buildMarketSnapshot } from './marketSnapshotService.js';
import { calendarService } from './calendarService.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { logApiCall } from './apiLoggerService.js';

export const ANALYTICAL_AGENTS = [
  fundamentalsAgent,
  centralBankAgent,
  ratesYieldAgent,
  crossAssetAgent,
  technicalAgent,
  positioningAgent,
  geopoliticalAgent,
  historicalReactionAgent
];

/**
 * Executes all 8 analytical AI agents in parallel on a point-in-time market snapshot
 */
export async function runAnalyticalAgents({ eventId, pair = 'XAUUSD' } = {}) {
  const startTime = Date.now();
  const runId = crypto.randomUUID();

  logger.info(`[Agent Coordinator] Initiating AI Team Analysis for ${pair} (Run ID: ${runId})...`);

  try {
    // 1. Build or retrieve point-in-time market snapshot
    const snapshot = await buildMarketSnapshot({ eventId, pair });

    // 2. Fetch event metadata
    let event = null;
    if (eventId) {
      try {
        event = await calendarService.getEventDetail(eventId);
      } catch (e) {
        logger.warn(`Could not load full event details for ${eventId}, continuing with baseline`, { error: e.message });
      }
    }

    if (!event) {
      event = {
        id: eventId || 'mock-event-cpi',
        event_name: 'US Consumer Price Index (YoY)',
        event_type: 'CPI',
        currency: 'USD',
        impact_level: 'HIGH',
        forecast_val: '3.1%',
        previous_val: '3.2%',
        release_time: new Date(Date.now() + 150 * 60 * 1000).toISOString()
      };
    }

    // 3. Create agent_runs session in Supabase if connected
    if (supabaseAdmin) {
      await supabaseAdmin.from('agent_runs').insert({
        id: runId,
        event_id: event.id,
        pair: pair.toUpperCase(),
        trigger_type: 'PRE_NEWS',
        status: 'RUNNING',
        started_at: new Date().toISOString()
      });
    }

    // 4. Dispatch all 8 analytical agents in parallel
    const agentPromises = ANALYTICAL_AGENTS.map(agent =>
      agent.analyze(snapshot, event).catch(err => {
        logger.error(`Error running agent ${agent.name}`, { error: err.message });
        return {
          agent_name: agent.name,
          bias: 'NO_TRADE',
          confidence: 0,
          key_factors: [`Agent execution error: ${err.message}`],
          risks: ['Failed to evaluate sub-factor'],
          data_used: {},
          tokens_used: 0,
          latency_ms: 0,
          error: true
        };
      })
    );

    const results = await Promise.all(agentPromises);

    // 5. Save outputs and compute consensus metrics
    let totalTokens = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let noTradeCount = 0;
    let confidenceSum = 0;

    const formattedOutputs = [];

    for (const res of results) {
      totalTokens += (res.tokens_used || 0);

      if (res.bias === 'BULLISH') bullishCount++;
      else if (res.bias === 'BEARISH') bearishCount++;
      else if (res.bias === 'NEUTRAL') neutralCount++;
      else noTradeCount++;

      confidenceSum += (res.confidence || 0);

      const outputRecord = {
        run_id: runId,
        agent_name: res.agent_name,
        bias: res.bias,
        confidence: res.confidence,
        key_factors: res.key_factors,
        risks: res.risks,
        data_used: res.data_used,
        execution_source: res.execution_source || 'deterministic'
      };

      formattedOutputs.push(outputRecord);

      if (supabaseAdmin) {
        await supabaseAdmin.from('agent_outputs').insert({
          id: crypto.randomUUID(),
          run_id: runId,
          agent_name: res.agent_name,
          bias: res.bias,
          confidence: res.confidence,
          key_factors: res.key_factors,
          risks: res.risks,
          data_used: res.data_used
        });
      }
    }

    const weightedConfidence = Math.round(confidenceSum / ANALYTICAL_AGENTS.length);
    let prevailingBias = 'NO_TRADE';
    if (bullishCount >= 4 && bullishCount > bearishCount) prevailingBias = 'BULLISH';
    else if (bearishCount >= 4 && bearishCount > bullishCount) prevailingBias = 'BEARISH';
    else if (neutralCount >= 4) prevailingBias = 'NEUTRAL';

    const consensusSummary = {
      totalAgents: ANALYTICAL_AGENTS.length,
      bullishCount,
      bearishCount,
      neutralCount,
      noTradeCount,
      weightedConfidence,
      prevailingBias
    };

    // 6. Finalize session in Supabase
    if (supabaseAdmin) {
      await supabaseAdmin.from('agent_runs').update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        total_tokens: totalTokens
      }).eq('id', runId);
    }

    logger.info(`[Agent Coordinator] AI Team Analysis completed for ${pair} in ${Date.now() - startTime}ms. Prevailing Bias: ${prevailingBias} (${weightedConfidence}%)`);

    return {
      runId,
      pair: pair.toUpperCase(),
      event,
      snapshot,
      outputs: formattedOutputs,
      consensusSummary,
      totalTokens,
      latencyMs: Date.now() - startTime
    };
  } catch (err) {
    logger.error('Fatal error in runAnalyticalAgents', { error: err.message });
    throw err;
  }
}

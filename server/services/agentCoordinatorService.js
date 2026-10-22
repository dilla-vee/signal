import crypto from 'node:crypto';
import { fundamentalsAgent } from '../agents/fundamentalsAgent.js';
import { centralBankAgent } from '../agents/centralBankAgent.js';
import { ratesYieldAgent } from '../agents/ratesYieldAgent.js';
import { crossAssetAgent } from '../agents/crossAssetAgent.js';
import { technicalAgent } from '../agents/technicalAgent.js';
import { positioningAgent } from '../agents/positioningAgent.js';
import { geopoliticalAgent } from '../agents/geopoliticalAgent.js';
import { historicalReactionAgent } from '../agents/historicalReactionAgent.js';
import { scenarioBuilderAgent } from '../agents/scenarioBuilderAgent.js';
import { devilsAdvocateAgent } from '../agents/devilsAdvocateAgent.js';
import { judgeAgent } from '../agents/judgeAgent.js';
import { buildMarketSnapshot } from './marketSnapshotService.js';
import { calendarService } from './calendarService.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { localSignalStore } from './postReleaseService.js';

export const localScenarioStore = new Map();

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

export const ALL_AGENTS = [
  ...ANALYTICAL_AGENTS,
  scenarioBuilderAgent,
  devilsAdvocateAgent,
  judgeAgent
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
        logger.warn(`Could not load full event details for ${eventId}, continuing with upcoming`, { error: e.message });
      }
    }

    if (!event) {
      const upcoming = await calendarService.getUpcomingEvents({ limit: 1, impact: 'ALL' });
      if (upcoming && upcoming.length > 0) {
        event = upcoming[0];
      }
    }

    if (!event) {
      throw new Error(`Real inputs required: No macroeconomic event found in calendar`);
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

/**
 * Full 11-Agent Intelligence Pipeline:
 * Phase A: Specialized Analytical Agents 1-8 (Parallel)
 * Phase B: Scenario Builder (Agent 9) & Devil's Advocate (Agent 10) (Parallel)
 * Phase C: Judge / Synthesizer (Agent 11) (Adjudication & Trade Parameters)
 * Phase D: Persistence to Supabase (and local store fallback)
 */
export async function runFullSignalPipeline({ eventId, pair = 'XAUUSD', userRules = {} } = {}) {
  const startTime = Date.now();
  const normalizedPair = pair.toUpperCase();

  logger.info(`[Pipeline] Launching complete 11-agent intelligence pipeline for ${normalizedPair}...`);

  // 1. Run Phase A: 8 Analytical Agents
  const phaseAResult = await runAnalyticalAgents({ eventId, pair: normalizedPair });
  const { runId, event, snapshot, outputs, consensusSummary } = phaseAResult;

  // 2. Run Phase B: Scenario Builder (Agent 9) & Devil's Advocate (Agent 10) in parallel
  logger.info(`[Pipeline] Phase B: Dispatching Scenario Builder & Devil's Advocate...`);
  const [scenarioResult, devAdvocateResult] = await Promise.all([
    scenarioBuilderAgent.buildPlaybook(snapshot, event, outputs, consensusSummary),
    devilsAdvocateAgent.interrogate(snapshot, event, outputs, consensusSummary)
  ]);

  // 3. Run Phase C: Judge / Synthesizer Agent (Agent 11)
  logger.info(`[Pipeline] Phase C: Synthesizing final verdict with Judge Agent...`);
  const judgeVerdict = await judgeAgent.adjudicate({
    marketSnapshot: snapshot,
    event,
    analyticalOutputs: outputs,
    consensusSummary,
    scenarioPlaybook: scenarioResult,
    devilsAdvocate: devAdvocateResult,
    userRules
  });

  const signalId = crypto.randomUUID();

  // 4. Construct Full Signal Record
  const finalizedSignal = {
    id: signalId,
    event_id: event.id,
    pair: normalizedPair,
    user_id: userRules.user_id || null,
    run_id: runId,
    direction: judgeVerdict.direction,
    confidence_pct: judgeVerdict.confidence_pct,
    timing: judgeVerdict.timing,
    suggested_entry: judgeVerdict.suggested_entry,
    entry_zone_min: judgeVerdict.entry_zone_min,
    entry_zone_max: judgeVerdict.entry_zone_max,
    stop_loss: judgeVerdict.stop_loss,
    take_profit_1: judgeVerdict.take_profit_1,
    take_profit_2: judgeVerdict.take_profit_2,
    risk_reward_ratio: judgeVerdict.risk_reward_ratio,
    position_size_lots: judgeVerdict.position_size_lots,
    key_drivers: judgeVerdict.key_drivers,
    key_risks: judgeVerdict.key_risks,
    dev_advocate_objections: judgeVerdict.devils_advocate_objections,
    agreed_agents: judgeVerdict.agreed_agents,
    disagreed_agents: judgeVerdict.disagreed_agents,
    reasoning_synthesis: judgeVerdict.reasoning_synthesis,
    event_name: event.event_name,
    release_time: event.release_time,
    expires_at: event.release_time || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 5. Deduplicate and Store Signal: Supersede any previous active signals for this pair
  for (const [existingId, existingSig] of localSignalStore.entries()) {
    if (existingSig.pair === normalizedPair && existingSig.status === 'ACTIVE') {
      localSignalStore.set(existingId, {
        ...existingSig,
        status: 'SUPERSEDED',
        updated_at: new Date().toISOString()
      });
    }
  }

  localSignalStore.set(signalId, finalizedSignal);
  localScenarioStore.set(event.id, {
    eventId: event.id,
    pair: normalizedPair,
    scenarios: scenarioResult.scenarios,
    expected_value_summary: scenarioResult.expected_value_summary
  });

  if (supabaseAdmin) {
    try {
      // Insert scenarios
      for (const sc of scenarioResult.scenarios) {
        await supabaseAdmin.from('scenarios').insert({
          id: crypto.randomUUID(),
          event_id: event.id,
          pair: normalizedPair,
          scenario_key: sc.scenario_key,
          scenario_name: sc.scenario_name,
          condition_description: sc.condition_description,
          probability_pct: sc.probability_pct,
          expected_first_reaction: sc.expected_first_reaction,
          expected_follow_through: sc.expected_follow_through,
          conditional_action: sc.conditional_action,
          invalidation_level: sc.invalidation_level,
          risk_notes: sc.risk_notes,
          expected_value_rating: sc.expected_value_rating
        });
      }

      // Insert finalized signal
      await supabaseAdmin.from('signals').insert({
        id: signalId,
        event_id: event.id,
        pair: normalizedPair,
        user_id: userRules.user_id || null,
        run_id: runId,
        direction: judgeVerdict.direction,
        confidence_pct: judgeVerdict.confidence_pct,
        timing: judgeVerdict.timing,
        suggested_entry: judgeVerdict.suggested_entry,
        entry_zone_min: judgeVerdict.entry_zone_min,
        entry_zone_max: judgeVerdict.entry_zone_max,
        stop_loss: judgeVerdict.stop_loss,
        take_profit_1: judgeVerdict.take_profit_1,
        take_profit_2: judgeVerdict.take_profit_2,
        risk_reward_ratio: judgeVerdict.risk_reward_ratio,
        position_size_lots: judgeVerdict.position_size_lots,
        key_drivers: judgeVerdict.key_drivers,
        key_risks: judgeVerdict.key_risks,
        dev_advocate_objections: judgeVerdict.devils_advocate_objections,
        agreed_agents: judgeVerdict.agreed_agents,
        disagreed_agents: judgeVerdict.disagreed_agents,
        status: 'ACTIVE'
      });
    } catch (dbErr) {
      logger.warn(`Could not persist pipeline results to Supabase`, { error: dbErr.message });
    }
  }

  const totalTokens = (phaseAResult.totalTokens || 0) + (scenarioResult.tokens_used || 0) + (devAdvocateResult.tokens_used || 0) + (judgeVerdict.tokens_used || 0);

  logger.info(`[Pipeline] Pipeline finished in ${Date.now() - startTime}ms. Signal Direction: ${finalizedSignal.direction} (${finalizedSignal.confidence_pct}%)`);

  return {
    runId,
    signalId,
    pair: normalizedPair,
    event,
    snapshot,
    analyticalOutputs: outputs,
    consensusSummary,
    scenarioPlaybook: scenarioResult,
    devilsAdvocate: devAdvocateResult,
    signal: finalizedSignal,
    totalTokens,
    latencyMs: Date.now() - startTime
  };
}

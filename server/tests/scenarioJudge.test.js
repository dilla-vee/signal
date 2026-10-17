import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scenarioBuilderAgent, ScenarioBuilderOutputSchema } from '../agents/scenarioBuilderAgent.js';
import { devilsAdvocateAgent, DevilsAdvocateOutputSchema } from '../agents/devilsAdvocateAgent.js';
import { judgeAgent, JudgeSignalOutputSchema } from '../agents/judgeAgent.js';
import { postReleaseService, localSignalStore } from '../services/postReleaseService.js';
import { runFullSignalPipeline } from '../services/agentCoordinatorService.js';

describe('Phase 4: Pre-News Scenario Playbook & Judge Tests', () => {
  const mockSnapshot = {
    pair: 'XAUUSD',
    current_price: 2650.00,
    us_10y_yield: 4.22,
    us_2y_yield: 3.98,
    dxy: 103.5,
    cot_gold_net: '+240,000',
    technical_summary: {
      trend: 'BULLISH',
      atr: 15.0,
      support: 2635.0,
      resistance: 2670.0
    }
  };

  const mockEvent = {
    id: 'test-event-cpi-001',
    event_name: 'US Consumer Price Index (YoY)',
    event_type: 'CPI',
    forecast_val: '3.1%',
    previous_val: '3.2%',
    impact_level: 'HIGH'
  };

  const mockConsensus = {
    totalAgents: 8,
    bullishCount: 6,
    bearishCount: 1,
    neutralCount: 1,
    weightedConfidence: 75,
    prevailingBias: 'BULLISH'
  };

  test('ScenarioBuilderAgent produces 5-point outcome matrix summing to 100% with conditional actions', async () => {
    const result = await scenarioBuilderAgent.buildPlaybook(mockSnapshot, mockEvent, [], mockConsensus);

    assert.equal(result.agent_name, 'Scenario Builder Agent');
    assert.equal(result.scenarios.length, 5);

    // Verify all 5 scenario keys exist
    const keys = result.scenarios.map(s => s.scenario_key);
    assert.ok(keys.includes('MUCH_HOTTER'));
    assert.ok(keys.includes('SLIGHTLY_HOTTER'));
    assert.ok(keys.includes('IN_LINE'));
    assert.ok(keys.includes('SLIGHTLY_COOLER'));
    assert.ok(keys.includes('MUCH_COOLER'));

    // Verify probabilities sum to exactly 100%
    const totalProb = result.scenarios.reduce((sum, s) => sum + s.probability_pct, 0);
    assert.equal(totalProb, 100);

    // Verify fields in each scenario
    for (const sc of result.scenarios) {
      assert.ok(sc.condition_description.length > 0);
      assert.ok(sc.expected_first_reaction.length > 0);
      assert.ok(sc.expected_follow_through.length > 0);
      assert.ok(sc.conditional_action.length > 0);
      assert.ok(typeof sc.invalidation_level === 'number');
      assert.ok(sc.risk_notes.length > 0);
      assert.ok(['POSITIVE_HIGH', 'POSITIVE_MODERATE', 'NEUTRAL', 'NEGATIVE_ASYMMETRIC'].includes(sc.expected_value_rating));
    }

    assert.ok(result.expected_value_summary.length > 0);
  });

  test("DevilsAdvocateAgent rigorously attacks emerging consensus with falsification triggers and vulnerability score", async () => {
    const result = await devilsAdvocateAgent.interrogate(mockSnapshot, mockEvent, [], mockConsensus);

    assert.equal(result.agent_name, "Devil's Advocate Agent");
    // Since consensus is BULLISH, Devil's Advocate should propose BEARISH counter-thesis
    assert.equal(result.bias, 'BEARISH');
    assert.ok(result.counter_thesis.length > 20);
    assert.ok(Array.isArray(result.falsification_triggers) && result.falsification_triggers.length > 0);
    assert.ok(Array.isArray(result.hidden_risks) && result.hidden_risks.length > 0);
    assert.ok(result.consensus_vulnerability_score >= 0 && result.consensus_vulnerability_score <= 100);
    assert.ok(Array.isArray(result.objection_list) && result.objection_list.length > 0);
  });

  test('JudgeAgent adjudicates BUY signal with exact pre-news entry zone, stop loss, take profit targets and lot size', async () => {
    const playbook = await scenarioBuilderAgent.buildPlaybook(mockSnapshot, mockEvent, [], mockConsensus);
    const devil = await devilsAdvocateAgent.interrogate(mockSnapshot, mockEvent, [], mockConsensus);

    const mockAnalyticalOutputs = [
      { agent_name: 'Fundamentals Agent', bias: 'BULLISH', confidence: 75 },
      { agent_name: 'Central Bank Agent', bias: 'BULLISH', confidence: 78 },
      { agent_name: 'Rates & Yield Agent', bias: 'BULLISH', confidence: 72 },
      { agent_name: 'Cross-Asset Agent', bias: 'BEARISH', confidence: 60 },
      { agent_name: 'Technical Structure Agent', bias: 'BULLISH', confidence: 70 },
      { agent_name: 'Positioning Agent', bias: 'NEUTRAL', confidence: 65 },
      { agent_name: 'Geopolitical Agent', bias: 'BULLISH', confidence: 80 },
      { agent_name: 'Historical Reaction Agent', bias: 'BULLISH', confidence: 74 }
    ];

    const verdict = await judgeAgent.adjudicate({
      marketSnapshot: mockSnapshot,
      event: mockEvent,
      analyticalOutputs: mockAnalyticalOutputs,
      consensusSummary: mockConsensus,
      scenarioPlaybook: playbook,
      devilsAdvocate: devil,
      userRules: { min_confidence: 60, risk_pct: 1.0, account_balance: 10000 }
    });

    assert.equal(verdict.agent_name, 'Judge / Synthesizer Agent');
    assert.equal(verdict.direction, 'BUY');
    assert.ok(verdict.confidence_pct >= 60);
    assert.ok(['pre_news_limit', 'post_news_confirmation', 'wait'].includes(verdict.timing));
    assert.equal(verdict.suggested_entry, 2650.00);
    assert.ok(verdict.stop_loss < 2650.00); // Stop Loss below entry for BUY
    assert.ok(verdict.take_profit_1 > 2650.00); // Take Profit above entry for BUY
    assert.ok(verdict.take_profit_2 > verdict.take_profit_1);
    assert.ok(verdict.risk_reward_ratio >= 1.5);
    assert.ok(verdict.position_size_lots > 0);
    assert.ok(verdict.entry_zone_min < verdict.entry_zone_max);
    assert.ok(verdict.agreed_agents.length >= 5);
    assert.ok(verdict.disagreed_agents.length >= 1);
    assert.ok(verdict.devils_advocate_objections.length > 0);
    assert.ok(verdict.reasoning_synthesis.includes('BUY'));
  });

  test('JudgeAgent produces NO_TRADE when agents exhibit severe conflict', async () => {
    const splitConsensus = {
      totalAgents: 8,
      bullishCount: 4,
      bearishCount: 4,
      neutralCount: 0,
      weightedConfidence: 52,
      prevailingBias: 'NO_TRADE'
    };

    const splitOutputs = [
      { agent_name: 'Agent A', bias: 'BULLISH', confidence: 55 },
      { agent_name: 'Agent B', bias: 'BULLISH', confidence: 55 },
      { agent_name: 'Agent C', bias: 'BULLISH', confidence: 55 },
      { agent_name: 'Agent D', bias: 'BULLISH', confidence: 55 },
      { agent_name: 'Agent E', bias: 'BEARISH', confidence: 55 },
      { agent_name: 'Agent F', bias: 'BEARISH', confidence: 55 },
      { agent_name: 'Agent G', bias: 'BEARISH', confidence: 55 },
      { agent_name: 'Agent H', bias: 'BEARISH', confidence: 55 }
    ];

    const verdict = await judgeAgent.adjudicate({
      marketSnapshot: mockSnapshot,
      event: mockEvent,
      analyticalOutputs: splitOutputs,
      consensusSummary: splitConsensus,
      scenarioPlaybook: null,
      devilsAdvocate: null,
      userRules: { min_confidence: 60 }
    });

    assert.equal(verdict.direction, 'NO_TRADE');
    assert.equal(verdict.timing, 'wait');
    assert.ok(verdict.reasoning_synthesis.includes('NO_TRADE'));
  });

  test('PostReleaseService evaluates release and updates status to CONFIRMED or FLIPPED', async () => {
    // Seed a signal into local store
    const testSignal = {
      id: 'test-sig-post-1',
      pair: 'XAUUSD',
      direction: 'BUY',
      suggested_entry: 2650.00,
      stop_loss: 2632.00,
      take_profit_1: 2686.00,
      confidence_pct: 75,
      status: 'ACTIVE'
    };
    localSignalStore.set(testSignal.id, testSignal);

    // Case 1: Cooler CPI (-0.3%) for Gold BUY -> CONFIRMED
    const confirmed = await postReleaseService.evaluateRelease({
      signalId: testSignal.id,
      actualValue: '2.8%', // 2.8% vs 3.1% forecast = -0.3% cooler -> Bullish Gold
      currentPrice: 2668.00,
      eventForecast: '3.1%'
    });

    assert.equal(confirmed.status, 'CONFIRMED');
    assert.equal(confirmed.post_release_action, 'TRAIL_STOP_TO_BREAKEVEN');
    assert.equal(confirmed.actual_surprise, -0.3);

    // Case 2: Much Hotter CPI (+0.4%) for Gold BUY -> FLIPPED
    const flipped = await postReleaseService.evaluateRelease({
      signalId: testSignal.id,
      actualValue: '3.5%', // 3.5% vs 3.1% forecast = +0.4% hotter -> Bearish Gold
      currentPrice: 2640.00,
      eventForecast: '3.1%'
    });

    assert.equal(flipped.status, 'FLIPPED');
    assert.equal(flipped.post_release_action, 'FLIP_TO_SELL');
    assert.equal(flipped.actual_surprise, 0.4);
  });

  test('runFullSignalPipeline executes complete 11-agent pipeline end-to-end', async () => {
    const pipelineResult = await runFullSignalPipeline({
      eventId: mockEvent.id,
      pair: 'XAUUSD',
      userRules: { min_confidence: 60, risk_pct: 1.0 }
    });

    assert.ok(pipelineResult.runId);
    assert.ok(pipelineResult.signalId);
    assert.equal(pipelineResult.pair, 'XAUUSD');
    assert.equal(pipelineResult.analyticalOutputs.length, 8);
    assert.ok(pipelineResult.consensusSummary);
    assert.equal(pipelineResult.scenarioPlaybook.scenarios.length, 5);
    assert.ok(pipelineResult.devilsAdvocate.objection_list.length > 0);
    assert.ok(['BUY', 'SELL', 'NO_TRADE'].includes(pipelineResult.signal.direction));
    assert.ok(pipelineResult.signal.suggested_entry > 0);
    assert.ok(pipelineResult.signal.stop_loss > 0);
    assert.ok(pipelineResult.signal.take_profit_1 > 0);
    assert.ok(pipelineResult.signal.risk_reward_ratio > 0);
  });
});

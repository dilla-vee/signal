import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { runAnalyticalAgents } from '../services/agentCoordinatorService.js';

describe('AI Agent Coordinator Tests', () => {
  test('runAnalyticalAgents coordinates all 8 specialized agents and computes consensus', async () => {
    const result = await runAnalyticalAgents({
      eventId: 'a0000000-0000-0000-0000-000000000001',
      pair: 'XAUUSD'
    });

    assert.ok(result.runId);
    assert.equal(result.pair, 'XAUUSD');
    assert.ok(Array.isArray(result.outputs));
    assert.equal(result.outputs.length, 8); // All 8 analytical agents completed

    // Check that each agent produced valid bias, confidence, and factors
    for (const out of result.outputs) {
      assert.ok(out.agent_name);
      assert.ok(['BULLISH', 'BEARISH', 'NEUTRAL', 'NO_TRADE'].includes(out.bias));
      assert.ok(out.confidence >= 0 && out.confidence <= 100);
      assert.ok(Array.isArray(out.key_factors));
      assert.ok(Array.isArray(out.risks));
    }

    // Check consensus summary
    assert.ok(result.consensusSummary);
    assert.ok(result.consensusSummary.totalAgents === 8);
    assert.ok(result.consensusSummary.bullishCount >= 0);
    assert.ok(result.consensusSummary.bearishCount >= 0);
    assert.ok(result.consensusSummary.weightedConfidence > 0);
  });
});

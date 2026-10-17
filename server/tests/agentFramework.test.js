import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BaseAgent, AgentOutputSchema } from '../agents/baseAgent.js';

describe('Base AI Agent Framework Tests', () => {
  test('AgentOutputSchema accepts valid structured outputs', () => {
    const validData = {
      bias: 'BULLISH',
      confidence: 75,
      key_factors: ['US real yields falling', 'Geopolitical safe haven physical demand'],
      risks: ['Headline energy spike on sticky oil'],
      data_used: { real_yield: 1.84, gold_price: 2658.40 }
    };

    const parsed = AgentOutputSchema.parse(validData);
    assert.equal(parsed.bias, 'BULLISH');
    assert.equal(parsed.confidence, 75);
    assert.equal(parsed.key_factors.length, 2);
  });

  test('AgentOutputSchema rejects invalid bias or confidence outside 0-100', () => {
    assert.throws(() => {
      AgentOutputSchema.parse({
        bias: 'SUPER_BULLISH', // invalid bias
        confidence: 80,
        key_factors: [],
        risks: [],
        data_used: {}
      });
    });

    assert.throws(() => {
      AgentOutputSchema.parse({
        bias: 'BULLISH',
        confidence: 150, // out of range
        key_factors: [],
        risks: [],
        data_used: {}
      });
    });
  });

  test('BaseAgent extracts clean JSON from markdown code fence', () => {
    const agent = new BaseAgent({ name: 'TestAgent', role: 'Tester' });
    const rawText = `Here is my structured analysis:
\`\`\`json
{
  "bias": "BEARISH",
  "confidence": 68,
  "key_factors": ["Rate differential favoring dollar"],
  "risks": ["Unexpected dove pivot"],
  "data_used": { "us_2y": 4.02 }
}
\`\`\`
Hope this helps!`;

    const parsed = agent.extractJson(rawText);
    assert.equal(parsed.bias, 'BEARISH');
    assert.equal(parsed.confidence, 68);
  });
});

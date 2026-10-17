import { z } from 'zod';
import { anthropicClient } from '../config/anthropic.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const AgentOutputSchema = z.object({
  bias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL', 'NO_TRADE']),
  confidence: z.number().int().min(0).max(100),
  key_factors: z.array(z.string()),
  risks: z.array(z.string()),
  data_used: z.record(z.any())
});

export class BaseAgent {
  constructor({ name, role, systemPrompt = '' }) {
    this.name = name;
    this.role = role;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Extracts JSON object from raw response text (handles code fences or plain text)
   */
  extractJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Raw response is empty or not a string');
    }

    // Try finding JSON inside ```json ... ``` code fence
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidateText = codeBlockMatch ? codeBlockMatch[1] : rawText;

    // Find the outer curly braces { ... }
    const firstBrace = candidateText.indexOf('{');
    const lastBrace = candidateText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error(`Failed to locate valid JSON braces in response from ${this.name}`);
    }

    const jsonSubstr = candidateText.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonSubstr);
  }

  /**
   * Primary entry point for agent execution
   */
  async analyze(marketSnapshot, event) {
    const startTime = Date.now();
    logger.debug(`[${this.name}] Starting macroeconomic analysis...`);

    // 1. If Anthropic Claude API is configured, call Claude
    if (anthropicClient) {
      try {
        const prompt = this.buildPrompt(marketSnapshot, event);
        const response = await anthropicClient.messages.create({
          model: config.anthropic.model,
          max_tokens: 1000,
          temperature: 0.1, // low temperature for consistent, disciplined reasoning
          system: `${this.systemPrompt}\n\nCRITICAL REQUIREMENT: You MUST reply ONLY with a single valid JSON object matching this exact schema:
{
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL" | "NO_TRADE",
  "confidence": number between 0 and 100,
  "key_factors": [string, string, ...],
  "risks": [string, string, ...],
  "data_used": { key: value, ... }
}
Do not include any prose before or after the JSON block.`,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        const rawText = response.content?.[0]?.text || '';
        const parsed = this.extractJson(rawText);
        const validated = AgentOutputSchema.parse(parsed);

        return {
          agent_name: this.name,
          ...validated,
          tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
          latency_ms: Date.now() - startTime,
          execution_source: 'anthropic_claude'
        };
      } catch (err) {
        logger.warn(`[${this.name}] Claude API execution failed, falling back to deterministic heuristic`, { error: err.message });
      }
    }

    // 2. Quantitative Deterministic Heuristic Fallback
    const heuristicResult = this.generateQuantitativeHeuristic(marketSnapshot, event);
    const validated = AgentOutputSchema.parse(heuristicResult);

    return {
      agent_name: this.name,
      ...validated,
      tokens_used: 0,
      latency_ms: Date.now() - startTime,
      execution_source: 'quantitative_heuristic'
    };
  }

  buildPrompt(marketSnapshot, event) {
    return `Analyze the following market condition for ${marketSnapshot.pair}:
EVENT: ${JSON.stringify(event, null, 2)}
MARKET SNAPSHOT: ${JSON.stringify(marketSnapshot, null, 2)}`;
  }

  /**
   * Child agents override this method with specialized macroeconomic logic
   */
  generateQuantitativeHeuristic(marketSnapshot, event) {
    return {
      bias: 'NEUTRAL',
      confidence: 50,
      key_factors: ['Default base agent neutral stance'],
      risks: ['Undetermined volatility'],
      data_used: {}
    };
  }
}

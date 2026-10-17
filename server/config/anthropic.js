import Anthropic from '@anthropic-ai/sdk';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let anthropicClient = null;

if (config.anthropic.apiKey) {
  try {
    anthropicClient = new Anthropic({
      apiKey: config.anthropic.apiKey
    });
    logger.info('Anthropic Claude Client initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize Anthropic Client', { error: err.message });
  }
} else {
  logger.warn('ANTHROPIC_API_KEY is not configured. AI Agents will run in quantitative heuristic mode.');
}

export { anthropicClient };

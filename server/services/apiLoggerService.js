import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export async function logApiCall({ provider, endpoint, statusCode, latencyMs, success, errorMessage = null, requestPayload = null }) {
  try {
    if (!supabaseAdmin) {
      logger.debug(`[API Log Mock] ${provider} ${endpoint} - ${statusCode} (${latencyMs}ms)`);
      return;
    }

    await supabaseAdmin.from('api_logs').insert({
      provider,
      endpoint,
      status_code: statusCode,
      latency_ms: latencyMs,
      success,
      error_message: errorMessage,
      request_payload: requestPayload
    });
  } catch (err) {
    logger.warn('Failed to persist API log entry', { error: err.message });
  }
}

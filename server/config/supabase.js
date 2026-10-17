import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let supabaseAdmin = null;
let supabasePublic = null;

if (config.supabase.url && config.supabase.serviceRoleKey) {
  try {
    supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    logger.info('Supabase Admin Client initialized with Service Role Key');
  } catch (err) {
    logger.error('Failed to initialize Supabase Admin Client', { error: err.message });
  }
} else {
  logger.warn('Supabase URL or Service Role Key missing in environment. Running in mock fallback mode.');
}

if (config.supabase.url && config.supabase.anonKey) {
  try {
    supabasePublic = createClient(config.supabase.url, config.supabase.anonKey);
  } catch (err) {
    logger.error('Failed to initialize Supabase Public Client', { error: err.message });
  }
}

export { supabaseAdmin, supabasePublic };

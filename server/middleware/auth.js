import { supabaseAdmin } from '../config/supabase.js';
import { formatApiError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatApiError('Missing or invalid Authorization header', null, 401));
    }

    const token = authHeader.split(' ')[1];

    if (!supabaseAdmin) {
      // In local dev without live Supabase, assign demo user
      req.user = { id: '00000000-0000-0000-0000-000000000001', email: 'demo@trader.local' };
      return next();
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn('Auth token verification failed', { error: error?.message });
      return res.status(401).json(formatApiError('Invalid or expired authentication token', null, 401));
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Error in requireAuth middleware', { error: err.message });
    return res.status(500).json(formatApiError('Internal authorization error', null, 500));
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || !supabaseAdmin) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  supabaseAdmin.auth.getUser(token)
    .then(({ data: { user } }) => {
      req.user = user || null;
      next();
    })
    .catch(() => {
      req.user = null;
      next();
    });
}

import express from 'express';
import { supabaseAdmin, supabasePublic } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { formatApiResponse, formatApiError } from '../utils/apiResponse.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Creates a new user in Supabase with pre-confirmed email (bypasses email rate limit).
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json(formatApiResponse(null, 'Email and password are required', false));
    }

    if (password.length < 6) {
      return res.status(400).json(formatApiResponse(null, 'Password must be at least 6 characters', false));
    }

    if (!supabaseAdmin) {
      // Standalone/mock fallback
      return res.json(formatApiResponse({ email, full_name: fullName }, 'Registered in standalone mode', true));
    }

    // 1. Check if user already exists
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && usersData?.users) {
      const existing = usersData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        // Update password and ensure email is confirmed
        const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existing.id,
          {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName || existing.user_metadata?.full_name || 'Macro Trader' }
          }
        );

        if (updateError) {
          logger.error('Failed to update existing user credentials', { error: updateError.message });
          return res.status(400).json(formatApiResponse(null, updateError.message, false));
        }

        // Upsert profile
        await supabaseAdmin.from('profiles').upsert({
          id: existing.id,
          email: existing.email,
          full_name: fullName || 'Macro Trader',
          timezone: 'Africa/Nairobi',
          account_size: 10000,
          risk_per_trade_pct: 1.0
        });

        logger.info(`User ${email} updated and auto-confirmed via admin API`);
        return res.json(formatApiResponse({ id: existing.id, email: existing.email }, 'User updated and pre-confirmed', true));
      }
    }

    // 2. Create new user with email_confirm: true
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || 'Macro Trader', timezone: 'Africa/Nairobi' }
    });

    if (createError) {
      logger.error('Failed to create user via admin API', { error: createError.message });
      return res.status(400).json(formatApiResponse(null, createError.message, false));
    }

    // 3. Upsert into public.profiles
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: created.user.id,
        email: created.user.email,
        full_name: fullName || 'Macro Trader',
        timezone: 'Africa/Nairobi',
        account_size: 10000,
        risk_per_trade_pct: 1.0
      });
    } catch (profileErr) {
      logger.warn('Failed to upsert profile record:', profileErr.message);
    }

    logger.info(`User ${email} registered and pre-confirmed with zero email rate-limit delay`);
    return res.json(formatApiResponse({ id: created.user.id, email: created.user.email }, 'Account registered and confirmed', true));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/verify-email
 * Unlocks any user stuck in unconfirmed state
 */
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !supabaseAdmin) {
      return res.json(formatApiResponse(null, 'No action needed', true));
    }

    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const found = usersData?.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (found) {
      await supabaseAdmin.auth.admin.updateUserById(found.id, { email_confirm: true });
      logger.info(`Auto-confirmed email for ${email}`);
      return res.json(formatApiResponse({ email }, 'Email successfully confirmed', true));
    }

    return res.json(formatApiResponse(null, 'User not found', false));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/demo-credentials
 * Provides public verified demo credentials
 */
router.get('/demo-credentials', (req, res) => {
  res.json(formatApiResponse({
    institutional: {
      email: 'trader@firm.com',
      password: 'MacroTrader2026!',
      label: 'Institutional Trader Account'
    },
    demo: {
      email: 'demo.trader@macrosigint.io',
      password: 'demo123456',
      label: 'Instant Demo Mode Account'
    }
  }, 'Verified credentials available', true));
});

export default router;

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },

  // Anthropic AI
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
  },

  // External APIs
  fredApiKey: process.env.FRED_API_KEY || '',
  blsApiKey: process.env.BLS_API_KEY || '',
  newsApiKey: process.env.NEWS_API_KEY || '',

  // Defaults
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Africa/Nairobi',
  defaultAccountBalance: parseFloat(process.env.DEFAULT_ACCOUNT_BALANCE || '10000'),
  defaultRiskPct: parseFloat(process.env.DEFAULT_RISK_PER_TRADE_PCT || '1.0'),

  simulateDataFallback: process.env.SIMULATE_DATA_FALLBACK !== 'false'
};

/**
 * Structured Logger utility
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'] ?? LOG_LEVELS.INFO;

function formatMessage(level, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

export const logger = {
  debug: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) console.debug(formatMessage('DEBUG', message, meta));
  },
  info: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.INFO) console.log(formatMessage('INFO', message, meta));
  },
  warn: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.WARN) console.warn(formatMessage('WARN', message, meta));
  },
  error: (message, meta) => {
    if (currentLevel <= LOG_LEVELS.ERROR) console.error(formatMessage('ERROR', message, meta));
  }
};

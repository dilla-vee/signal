import { formatApiError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(formatApiError(message, process.env.NODE_ENV === 'development' ? err.stack : null, statusCode));
}

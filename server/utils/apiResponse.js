/**
 * Standard API Response envelope
 */
export function formatApiResponse(data = null, message = 'Success', success = true) {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

export function formatApiError(message = 'An unexpected error occurred', details = null, statusCode = 500) {
  return {
    success: false,
    message,
    error: details,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

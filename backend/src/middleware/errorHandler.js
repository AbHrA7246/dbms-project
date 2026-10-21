/**
 * Centralized Express Error Handling Middleware.
 * Catches all errors from synchronous and asynchronous route handlers.
 * Sanitizes output to prevent leaking database internals, credentials, or stack traces.
 */
export function errorHandler(err, _req, res, _next) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Log error to backend console for debugging
  console.error('[SERVER ERROR]', err.message || err);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : (err.name || 'Error'),
    message: isDevelopment ? err.message : 'An unexpected error occurred.',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && err.stack ? { stack: err.stack } : {}),
  });
}

export default errorHandler;

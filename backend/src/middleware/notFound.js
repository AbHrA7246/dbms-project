/**
 * 404 Handler for undefined API routes.
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
}

export default notFoundHandler;

/**
 * Express Global Error Handler Middleware
 *
 * Catches all unhandled errors from async route handlers and returns
 * a structured JSON error response. Must be registered LAST in the
 * Express middleware chain (after all routes).
 *
 * @module middleware/errorHandler
 */

import logger from '../utils/logger.js';

/**
 * Global error handler. Express requires exactly 4 parameters to
 * recognize this as an error-handling middleware.
 *
 * @param {Error}    err  - The thrown/rejected error.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  logger.error(`[HTTP] ${req.method} ${req.url} — ${err.message}`);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}

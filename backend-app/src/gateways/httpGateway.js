/**
 * HTTP Gateway — Express Router
 *
 * Thin protocol adapter that maps RESTful routes to shared controllers.
 * All business logic lives in controllers/services — this file only
 * handles HTTP-specific concerns (req/res, status codes, query params).
 *
 * @module gateways/httpGateway
 */

import { Router } from 'express';
import { handleDetection } from '../controllers/detectionController.js';
import * as alertController from '../controllers/alertController.js';
import * as dssController from '../controllers/dssController.js';
import * as telemetryController from '../controllers/telemetryController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as authController from '../controllers/authController.js';
import { apiKeyAuth, jwtAuth } from '../middleware/authMiddleware.js';

const router = Router();

// ─────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Public endpoint for admin dashboard login.
 */
router.post('/api/auth/login', authController.login);

/**
 * GET /api/auth/me
 * Get current user profile.
 */
router.get('/api/auth/me', jwtAuth, authController.me);

// ─────────────────────────────────────────────────────
// Detection Ingestion
// ─────────────────────────────────────────────────────

/**
 * POST /api/detect
 * Ingest a detection payload from the edge device via HTTP.
 */
router.post('/api/detect', apiKeyAuth, async (req, res) => {
  const result = await handleDetection(req.body, 'HTTP');
  const status = result.success ? 200 : (result.statusCode || 500);
  res.status(status).json(result);
});

/**
 * GET /api/detect/latest
 * Get the most recent detection log (HTTP polling fallback for Live Monitor).
 */
router.get('/api/detect/latest', jwtAuth, async (req, res) => {
  const result = await dashboardController.getLatestDetection();
  res.json(result);
});

// ─────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────

/**
 * GET /api/dashboard/summary
 * Aggregated dashboard summary (stats, alerts, top pest, uptime).
 */
router.get('/api/dashboard/summary', jwtAuth, async (req, res) => {
  const result = await dashboardController.getSummary();
  res.json(result);
});

/**
 * GET /api/dashboard/trend
 * Detection trend over N days, bucketed by day and protocol.
 * Query params: days (default 7)
 */
router.get('/api/dashboard/trend', jwtAuth, async (req, res) => {
  const result = await dashboardController.getTrend(req.query);
  res.json(result);
});

// ─────────────────────────────────────────────────────
// Session History
// ─────────────────────────────────────────────────────

/**
 * GET /api/sessions
 * Paginated scan session history.
 * Query params: limit, offset
 */
router.get('/api/sessions', jwtAuth, async (req, res) => {
  const result = await dashboardController.getSessionHistory(req.query);
  res.json(result);
});

// ─────────────────────────────────────────────────────
// Telemetry / Historical Logs
// ─────────────────────────────────────────────────────

/**
 * GET /api/logs
 * Paginated detection log history.
 * Query params: protokol, limit, offset, startDate, endDate
 */
router.get('/api/logs', jwtAuth, async (req, res) => {
  const result = await telemetryController.getLogs(req.query);
  res.json(result);
});

/**
 * GET /api/logs/stats
 * QoS latency statistics grouped by protocol.
 * Query params: protokol, startDate, endDate
 */
router.get('/api/logs/stats', jwtAuth, async (req, res) => {
  const result = await telemetryController.getStats(req.query);
  res.json(result);
});

/**
 * GET /api/logs/:id/details
 * Detection details for a specific log entry.
 */
router.get('/api/logs/:id/details', jwtAuth, async (req, res) => {
  const result = await telemetryController.getLogDetails(req.params.id);
  res.json(result);
});

// ─────────────────────────────────────────────────────
// Alerts / Notifications
// ─────────────────────────────────────────────────────

/**
 * GET /api/alerts
 * Paginated alerts with optional status/severity filter.
 * Query params: status, severity, limit, offset
 */
router.get('/api/alerts', jwtAuth, async (req, res) => {
  const result = await alertController.getAlerts(req.query);
  res.json(result);
});

/**
 * PATCH /api/alerts/:id/acknowledge
 * Acknowledge an active alert.
 */
router.patch('/api/alerts/:id/acknowledge', jwtAuth, async (req, res) => {
  const result = await alertController.acknowledgeAlert(req.params.id);
  const status = result.success ? 200 : (result.statusCode || 500);
  res.status(status).json(result);
});

/**
 * PATCH /api/alerts/:id/resolve
 * Resolve an active or acknowledged alert.
 */
router.patch('/api/alerts/:id/resolve', jwtAuth, async (req, res) => {
  const result = await alertController.resolveAlert(req.params.id);
  const status = result.success ? 200 : (result.statusCode || 500);
  res.status(status).json(result);
});

// ─────────────────────────────────────────────────────
// DSS (Decision Support System)
// ─────────────────────────────────────────────────────

/**
 * GET /api/pests
 * List all pests in the knowledge base.
 */
router.get('/api/pests', jwtAuth, async (req, res) => {
  const result = await dssController.getAllPests();
  res.json(result);
});

/**
 * GET /api/dss/:pestName
 * Get DSS mitigations for a specific pest.
 */
router.get('/api/dss/:pestName', jwtAuth, async (req, res) => {
  const result = await dssController.getMitigations(req.params.pestName);
  const status = result.success ? 200 : (result.statusCode || 500);
  res.status(status).json(result);
});

// ─────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    protocol: 'HTTP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;

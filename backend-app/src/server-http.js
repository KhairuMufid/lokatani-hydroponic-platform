/**
 * HTTP Server Entry Point
 *
 * Express-based REST server for the pest detection ingestion pipeline.
 * Isolated process for QoS stress-testing — run via: npm run start:http
 *
 * Features:
 * - 10MB JSON body limit (Base64 payloads are large)
 * - CORS enabled for frontend dashboard
 * - Global async error handler
 * - Automatic image cleanup job
 *
 * @module server-http
 */

import express from 'express';
import cors from 'cors';
import env from './config/env.js';
import httpGateway from './gateways/httpGateway.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startCleanupJob } from './utils/cleanupJob.js';
import logger from './utils/logger.js';

const app = express();

// ─── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // CRITICAL: Base64 payloads exceed default 100kb

// ─── Static File Serving (saved detection images) ────
app.use('/uploads', express.static('uploads'));

// ─── Routes ──────────────────────────────────────────
app.use(httpGateway);

// ─── Global Error Handler (must be LAST) ─────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────
const server = app.listen(env.PORT_HTTP, () => {
  logger.info(`[HTTP] Server listening on port ${env.PORT_HTTP}`);
  logger.info(`[HTTP] POST http://localhost:${env.PORT_HTTP}/api/detect`);
  logger.info(`[HTTP] GET  http://localhost:${env.PORT_HTTP}/health`);
});

// ─── TCP Keep-Alive for High-Frequency Polling ───────
// Prevents TCP handshake overhead during 15 FPS HTTP polling.
server.keepAliveTimeout = 65000;   // 65s — keep socket open between polls
server.headersTimeout = 66000;     // Must exceed keepAliveTimeout

// Start automatic image cleanup
startCleanupJob();

// ─── Graceful Shutdown ───────────────────────────────
process.on('SIGINT', () => {
  logger.info('[HTTP] Shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('[HTTP] Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[HTTP] Unhandled rejection:', reason);
});

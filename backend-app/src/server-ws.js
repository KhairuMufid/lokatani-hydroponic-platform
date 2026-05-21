/**
 * WebSocket Server Entry Point
 *
 * Standalone WS server for the pest detection ingestion pipeline.
 * Isolated process for QoS stress-testing — run via: npm run start:ws
 *
 * Features:
 * - Action-based message routing
 * - Real-time alert broadcasting to all clients
 * - Robust JSON parse guards (malformed messages don't crash the server)
 * - Automatic image cleanup job
 *
 * @module server-ws
 */

import { WebSocketServer } from 'ws';
import env from './config/env.js';
import { initWsGateway } from './gateways/wsGateway.js';
import { startCleanupJob } from './utils/cleanupJob.js';
import logger from './utils/logger.js';

const PORT = env.PORT_WS;

// ─── Create WebSocket Server ─────────────────────────
const wss = new WebSocketServer({ port: PORT }, () => {
  logger.info(`[WS] Server listening on port ${PORT}`);
  logger.info(`[WS] Connect via: ws://localhost:${PORT}`);
});

// ─── Initialize Gateway ──────────────────────────────
initWsGateway(wss);

// ─── Start automatic image cleanup ───────────────────
startCleanupJob();

// ─── Graceful Shutdown ───────────────────────────────
process.on('SIGINT', () => {
  logger.info('[WS] Shutting down...');
  wss.close(() => {
    logger.info('[WS] All connections closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('[WS] Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[WS] Unhandled rejection:', reason);
});

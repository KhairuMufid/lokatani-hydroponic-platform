/**
 * MQTT Subscriber Entry Point
 *
 * Connects as a CLIENT to the external Eclipse Mosquitto broker and
 * subscribes to the pest detection topic. This Node process is NOT
 * the broker — Mosquitto runs separately on port 1883.
 *
 * Isolated process for QoS stress-testing — run via: npm run start:mqtt
 *
 * Features:
 * - Topic-based message routing
 * - Auto-reconnect with 5s interval
 * - Alert broadcasting on lokatani/alerts/new
 * - Automatic image cleanup job
 *
 * @module server-mqtt
 */

import env from './config/env.js';
import { createMqttClient } from './config/mqtt.js';
import { initMqttGateway } from './gateways/mqttGateway.js';
import { startCleanupJob } from './utils/cleanupJob.js';
import logger from './utils/logger.js';

// ─── Create MQTT Client & Connect ───────────────────
const client = createMqttClient();

// ─── Initialize Gateway ──────────────────────────────
initMqttGateway(client);

// ─── Start automatic image cleanup ───────────────────
startCleanupJob();

logger.info(`[MQTT] Connecting to broker: ${env.MQTT_BROKER_URL}`);

// ─── Graceful Shutdown ───────────────────────────────
process.on('SIGINT', () => {
  logger.info('[MQTT] Shutting down...');
  client.end(false, {}, () => {
    logger.info('[MQTT] Disconnected from broker');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('[MQTT] Uncaught exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[MQTT] Unhandled rejection:', reason);
});

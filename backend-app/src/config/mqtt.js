/**
 * MQTT Client Factory & Topic Definitions
 *
 * Creates a pre-configured MQTT client that connects to the external
 * Mosquitto broker. Exports topic constants for consistent usage
 * across gateways and controllers.
 *
 * @module config/mqtt
 */

import mqtt from 'mqtt';
import env from './env.js';
import logger from '../utils/logger.js';

/** Canonical MQTT topic map */
export const TOPICS = Object.freeze({
  // Ingestion (Edge → Server)
  DETECT_UP:       'lokatani/detect/up',
  // Response (Server → Edge / Frontend)
  DETECT_DOWN:     'lokatani/detect/down',
  // Session lifecycle (Edge ↔ Server)
  SESSION_START:   'lokatani/session/start',
  SESSION_END:     'lokatani/session/end',
  SESSION_ACK:     'lokatani/session/ack',
  // Alert system
  ALERTS_REQUEST:  'lokatani/alerts/request',
  ALERTS_RESPONSE: 'lokatani/alerts/response',
  ALERTS_NEW:      'lokatani/alerts/new',
  // DSS queries
  DSS_REQUEST:     'lokatani/dss/request',
  DSS_RESPONSE:    'lokatani/dss/response',
  // Live frame for frontend
  LIVE_FRAME:      'lokatani/live/frame',
});

/**
 * Create and return a connected MQTT client instance.
 * Handles connection, error, and reconnect events internally.
 * @returns {import('mqtt').MqttClient}
 */
export function createMqttClient() {
  const client = mqtt.connect(env.MQTT_BROKER_URL, {
    clientId: env.MQTT_CLIENT_ID,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    logger.info(`[MQTT] Connected to broker: ${env.MQTT_BROKER_URL}`);
  });

  client.on('error', (err) => {
    logger.error('[MQTT] Client error:', err.message);
  });

  client.on('reconnect', () => {
    logger.warn('[MQTT] Reconnecting to broker...');
  });

  client.on('offline', () => {
    logger.warn('[MQTT] Client went offline');
  });

  return client;
}

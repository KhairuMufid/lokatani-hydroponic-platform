/**
 * Centralized Environment Variable Configuration
 *
 * Validates and exports all env vars with sensible defaults.
 * Every module imports from here instead of reading process.env directly.
 *
 * @module config/env
 */

import 'dotenv/config';

const env = Object.freeze({
  // PostgreSQL
  DB_HOST:     process.env.DB_HOST || 'localhost',
  DB_PORT:     parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER:     process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME:     process.env.DB_NAME || 'lokatani',
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '20', 10),

  // Server Ports
  PORT_HTTP: parseInt(process.env.PORT_HTTP || '3000', 10),
  PORT_WS:   parseInt(process.env.PORT_WS || '8080', 10),

  // MQTT
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  MQTT_CLIENT_ID:  process.env.MQTT_CLIENT_ID || 'lokatani-backend',

  // Alert Thresholds
  ALERT_THRESHOLD_HIGH:    parseFloat(process.env.ALERT_THRESHOLD_HIGH || '0.9'),
  ALERT_THRESHOLD_MEDIUM:  parseFloat(process.env.ALERT_THRESHOLD_MEDIUM || '0.7'),
  ALERT_THRESHOLD_LOW:     parseFloat(process.env.ALERT_THRESHOLD_LOW || '0.5'),
  ALERT_CRITICAL_COUNT:    parseInt(process.env.ALERT_CRITICAL_COUNT || '3', 10),

  // Image Storage
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/images',

  // Logging
  LOG_LEVEL: (process.env.LOG_LEVEL || 'INFO').toUpperCase(),

  // Session Management
  SESSION_GAP_MS: parseInt(process.env.SESSION_GAP_MS || '5000', 10), // 5s gap = session boundary

  // Deduplication (Centroid Tracking)
  DEDUP_DISTANCE_THRESHOLD: parseFloat(process.env.DEDUP_DISTANCE_THRESHOLD || '60'),  // max Euclidean px
  DEDUP_TEMPORAL_WINDOW:    parseInt(process.env.DEDUP_TEMPORAL_WINDOW || '15', 10),    // max scan points
  DEDUP_PER_FRAME_DRIFT:    parseFloat(process.env.DEDUP_PER_FRAME_DRIFT || '1.5'),    // px/frame camera shift

  // Confidence Gate
  MIN_CONFIDENCE: parseFloat(process.env.MIN_CONFIDENCE || '0.60'),

  // Dual-Auth Security
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN_SEC: parseInt(process.env.JWT_EXPIRES_IN_SEC || '86400', 10), // 24 hours
  API_KEY: process.env.API_KEY || 'lokatani-edge-device-key',
});

export default env;

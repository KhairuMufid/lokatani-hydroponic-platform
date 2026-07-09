/**
 * Recovery Time Tracker — Automated Dependency Failure Measurement
 *
 * Provides precision timing for microservice dependency outages.
 * Tracks the exact moment a dependency goes offline (MQTT Broker / PostgreSQL)
 * and calculates the Recovery Time (Total Downtime) in milliseconds when
 * the dependency comes back online.
 *
 * Used by: config/mqtt.js, config/database.js
 * Output:  Structured log lines printed to stdout (captured by docker logs)
 *
 * Metrics produced:
 *   - DOWNTIME_START  → timestamp when failure was first detected
 *   - RECOVERY        → timestamp when connection was restored + duration
 *
 * @module utils/recoveryTracker
 */

import logger from './logger.js';

/**
 * Internal state: per-service outage tracking.
 * Key   = service name (e.g. 'MQTT_BROKER', 'POSTGRESQL')
 * Value = { downSince: number (Date.now()), logged: boolean }
 */
const outages = new Map();

/**
 * Record the start of a dependency outage.
 * Idempotent — calling multiple times during the same outage only records
 * the FIRST failure timestamp (which is the correct measurement point).
 *
 * @param {string} service - Human-readable service identifier
 */
export function markDown(service) {
  if (outages.has(service)) return; // already tracking this outage

  const now = Date.now();
  outages.set(service, { downSince: now });

  logger.warn(
    `[RECOVERY] ⚠️  DOWNTIME_START | Service: ${service} | ` +
    `Timestamp: ${new Date(now).toISOString()} | ` +
    `Status: OFFLINE`
  );
}

/**
 * Record the recovery of a dependency and calculate Total Downtime.
 * Only produces output if there was a preceding markDown() call.
 *
 * @param {string} service - Must match the service name used in markDown()
 * @returns {{ recoveryMs: number } | null} Recovery metrics or null if not in outage
 */
export function markUp(service) {
  if (!outages.has(service)) return null; // wasn't in an outage

  const now = Date.now();
  const { downSince } = outages.get(service);
  const recoveryMs = now - downSince;

  // Convert to human-readable duration
  const seconds = (recoveryMs / 1000).toFixed(3);

  logger.info(
    `[RECOVERY] ✅ RECOVERY | Service: ${service} | ` +
    `Down_At: ${new Date(downSince).toISOString()} | ` +
    `Up_At: ${new Date(now).toISOString()} | ` +
    `Recovery_Time: ${recoveryMs}ms (${seconds}s) | ` +
    `Status: ONLINE`
  );

  // Clear the outage record
  outages.delete(service);

  return { recoveryMs };
}

/**
 * Check if a service is currently marked as down.
 * @param {string} service
 * @returns {boolean}
 */
export function isDown(service) {
  return outages.has(service);
}

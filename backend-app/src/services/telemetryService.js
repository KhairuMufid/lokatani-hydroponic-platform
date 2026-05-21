/**
 * Telemetry Service
 *
 * Business logic for retrieving historical detection logs,
 * QoS statistics, and per-log detection details.
 *
 * @module services/telemetryService
 */

import * as telemetryRepo from '../repositories/telemetryRepo.js';

/**
 * Get paginated detection logs with total count for pagination metadata.
 *
 * @param {Object} filters - { protokol, limit, offset, startDate, endDate }
 * @returns {Promise<{logs: Array, total: number, limit: number, offset: number}>}
 */
export async function getLogs(filters = {}) {
  const { limit = 50, offset = 0 } = filters;

  const [logs, total] = await Promise.all([
    telemetryRepo.findLogs(filters),
    telemetryRepo.countLogs(filters),
  ]);

  return { logs, total, limit, offset };
}

/**
 * Get QoS latency statistics grouped by protocol.
 * Full metrics suite: AVG, MIN, MAX, STDDEV, P50, P95, P99.
 *
 * @param {Object} filters - { protokol, startDate, endDate }
 * @returns {Promise<Array>}
 */
export async function getStats(filters = {}) {
  return telemetryRepo.getStats(filters);
}

/**
 * Get detection details for a specific log entry.
 *
 * @param {number} logId
 * @returns {Promise<Array>}
 */
export async function getLogDetails(logId) {
  return telemetryRepo.findDetailsByLogId(logId);
}

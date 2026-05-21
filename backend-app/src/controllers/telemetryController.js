/**
 * Telemetry Controller
 *
 * Framework-agnostic orchestrator for historical log queries
 * and QoS statistics retrieval.
 *
 * @module controllers/telemetryController
 */

import * as telemetryService from '../services/telemetryService.js';
import logger from '../utils/logger.js';

/**
 * Get paginated detection logs with total count.
 *
 * @param {Object} filters - { protokol, limit, offset, startDate, endDate }
 * @returns {Promise<Object>}
 */
export async function getLogs(filters = {}) {
  try {
    // Sanitize pagination params
    const sanitized = {
      ...filters,
      limit: Math.min(parseInt(filters.limit) || 50, 200),
      offset: Math.max(parseInt(filters.offset) || 0, 0),
    };

    const data = await telemetryService.getLogs(sanitized);
    return { success: true, ...data };
  } catch (err) {
    logger.error('[CONTROLLER] getLogs error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get QoS latency statistics grouped by protocol.
 *
 * @param {Object} filters - { protokol, startDate, endDate }
 * @returns {Promise<Object>}
 */
export async function getStats(filters = {}) {
  try {
    const data = await telemetryService.getStats(filters);
    return { success: true, data };
  } catch (err) {
    logger.error('[CONTROLLER] getStats error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get detection details for a specific log entry.
 *
 * @param {number} logId
 * @returns {Promise<Object>}
 */
export async function getLogDetails(logId) {
  try {
    if (!logId) {
      return { success: false, error: 'Log ID is required', statusCode: 400 };
    }

    const data = await telemetryService.getLogDetails(logId);
    return { success: true, data };
  } catch (err) {
    logger.error('[CONTROLLER] getLogDetails error:', err.message);
    return { success: false, error: err.message };
  }
}

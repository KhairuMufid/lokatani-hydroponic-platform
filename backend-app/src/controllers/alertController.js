/**
 * Alert Controller
 *
 * Framework-agnostic orchestrator for alert CRUD operations.
 * Handles listing, acknowledging, and resolving alerts.
 *
 * @module controllers/alertController
 */

import * as alertService from '../services/alertService.js';
import logger from '../utils/logger.js';

/**
 * Get paginated alerts with optional filters.
 *
 * @param {Object} [filters] - { status, severity, limit, offset }
 * @returns {Promise<Object>}
 */
export async function getAlerts(filters = {}) {
  try {
    const [alerts, counts] = await Promise.all([
      alertService.getAlerts(filters),
      alertService.getAlertCounts(),
    ]);

    return {
      success: true,
      data: alerts,
      counts,
    };
  } catch (err) {
    logger.error('[CONTROLLER] getAlerts error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Acknowledge an alert by ID.
 *
 * @param {number} alertId
 * @returns {Promise<Object>}
 */
export async function acknowledgeAlert(alertId) {
  try {
    const alert = await alertService.acknowledgeAlert(alertId);

    if (!alert) {
      return {
        success: false,
        error: `Alert #${alertId} not found or already acknowledged`,
        statusCode: 404,
      };
    }

    logger.info(`[ALERT] Acknowledged alert #${alertId}`);
    return { success: true, data: alert };
  } catch (err) {
    logger.error('[CONTROLLER] acknowledgeAlert error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Resolve an alert by ID.
 *
 * @param {number} alertId
 * @returns {Promise<Object>}
 */
export async function resolveAlert(alertId) {
  try {
    const alert = await alertService.resolveAlert(alertId);

    if (!alert) {
      return {
        success: false,
        error: `Alert #${alertId} not found or already resolved`,
        statusCode: 404,
      };
    }

    logger.info(`[ALERT] Resolved alert #${alertId}`);
    return { success: true, data: alert };
  } catch (err) {
    logger.error('[CONTROLLER] resolveAlert error:', err.message);
    return { success: false, error: err.message };
  }
}

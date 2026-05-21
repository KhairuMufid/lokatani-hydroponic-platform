/**
 * Dashboard Controller
 *
 * Framework-agnostic orchestrator for dashboard queries.
 *
 * @module controllers/dashboardController
 */

import * as dashboardService from '../services/dashboardService.js';
import { getLatestFrame } from '../utils/latestFrameBuffer.js';
import logger from '../utils/logger.js';

/**
 * Get aggregated dashboard summary.
 * @returns {Promise<Object>}
 */
export async function getSummary() {
  try {
    const data = await dashboardService.getSummary();
    return { success: true, data };
  } catch (err) {
    logger.error('[CONTROLLER] getSummary error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get detection trend data.
 * @param {Object} [filters] - { days }
 * @returns {Promise<Object>}
 */
export async function getTrend(filters = {}) {
  try {
    const days = parseInt(filters.days) || 7;
    const data = await dashboardService.getTrend(days);
    return { success: true, data };
  } catch (err) {
    logger.error('[CONTROLLER] getTrend error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get latest detection for HTTP polling fallback.
 * Reads from the in-memory latestFrameBuffer — zero DB queries.
 * The buffer is updated on every processDetection() call.
 * @returns {Object}
 */
export function getLatestDetection() {
  const data = getLatestFrame();
  if (!data) {
    return { success: true, data: null };
  }
  return { success: true, data };
}

/**
 * Get paginated session history.
 * @param {Object} [filters] - { limit, offset }
 * @returns {Promise<Object>}
 */
export async function getSessionHistory(filters = {}) {
  try {
    const limit = parseInt(filters.limit) || 20;
    const offset = parseInt(filters.offset) || 0;
    const data = await dashboardService.getSessionHistory({ limit, offset });
    return { success: true, ...data };
  } catch (err) {
    logger.error('[CONTROLLER] getSessionHistory error:', err.message);
    return { success: false, error: err.message };
  }
}

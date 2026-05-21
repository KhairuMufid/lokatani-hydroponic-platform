/**
 * DSS Controller
 *
 * Framework-agnostic orchestrator for Decision Support System queries.
 * Retrieves pest information and mitigation plans.
 *
 * @module controllers/dssController
 */

import * as dssService from '../services/dssService.js';
import logger from '../utils/logger.js';

/**
 * Get DSS mitigations for a specific pest by name.
 *
 * @param {string} pestName - e.g. 'kutu_daun'
 * @returns {Promise<Object>}
 */
export async function getMitigations(pestName) {
  try {
    if (!pestName) {
      return { success: false, error: 'Pest name is required', statusCode: 400 };
    }

    const data = await dssService.getMitigations(pestName);

    if (!data) {
      return {
        success: false,
        error: `Pest "${pestName}" not found in DSS knowledge base`,
        statusCode: 404,
      };
    }

    return { success: true, data };
  } catch (err) {
    logger.error('[CONTROLLER] getMitigations error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get all pest records from the knowledge base.
 *
 * @returns {Promise<Object>}
 */
export async function getAllPests() {
  try {
    const data = await dssService.getAllPests();
    return { success: true, data };
  } catch (err) {
    logger.error('[CONTROLLER] getAllPests error:', err.message);
    return { success: false, error: err.message };
  }
}

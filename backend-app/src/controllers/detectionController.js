/**
 * Detection Controller
 *
 * Framework-agnostic orchestrator for the pest detection pipeline.
 * All three gateways (HTTP, WS, MQTT) call this single function.
 *
 * @module controllers/detectionController
 */

import * as detectionService from '../services/detectionService.js';
import logger from '../utils/logger.js';

/**
 * Handle an incoming detection payload.
 *
 * @param {Object} payload  - Parsed JSON payload from edge device
 * @param {string} protokol - 'HTTP' | 'WS' | 'MQTT'
 * @returns {Promise<Object>} Structured result
 */
export async function handleDetection(payload, protokol) {
  try {
    const result = await detectionService.processDetection(payload, protokol);
    return result;
  } catch (err) {
    logger.error(`[CONTROLLER] Detection error (${protokol}):`, err.message);

    return {
      success: false,
      error: err.message,
      statusCode: err.statusCode || 500,
    };
  }
}

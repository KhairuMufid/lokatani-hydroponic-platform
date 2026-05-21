/**
 * Alert Service
 *
 * Business logic for the alert/notification system.
 * Evaluates detection results against configurable confidence thresholds
 * and creates alerts with appropriate severity levels.
 *
 * @module services/alertService
 */

import * as alertRepo from '../repositories/alertRepo.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Evaluate detections and conditionally create an alert.
 *
 * Severity rules:
 * - critical: ≥ ALERT_CRITICAL_COUNT distinct pests in one frame
 * - high:     any pest with confidence ≥ ALERT_THRESHOLD_HIGH
 * - medium:   any pest with confidence ≥ ALERT_THRESHOLD_MEDIUM
 * - low:      any pest with confidence ≥ ALERT_THRESHOLD_LOW
 * - (none):   no pests detected, or all below LOW threshold
 *
 * @param {bigint}  detectionLogId - FK to tb_detection_log
 * @param {Array}   detections     - Raw detections array from payload
 * @param {Map}     pestMap        - Map of pest_name → hama_id
 * @returns {Promise<Object|null>} Created alert row, or null if no alert needed
 */
export async function evaluateAndCreate(detectionLogId, detections, pestMap) {
  if (!detections.length) return null;

  // Find the maximum confidence across all detections
  const maxConfidence = Math.max(...detections.map(d => d.confidence || 0));

  // Count distinct pest classes
  const uniquePests = new Set(detections.map(d => d.class_name).filter(Boolean));
  const distinctCount = uniquePests.size;

  // Determine severity
  let severity = null;
  let message = '';

  if (distinctCount >= env.ALERT_CRITICAL_COUNT) {
    severity = 'critical';
    const pestNames = [...uniquePests].join(', ');
    message = `CRITICAL: ${distinctCount} jenis hama terdeteksi dalam satu frame — ${pestNames}. Segera lakukan penanganan!`;
  } else if (maxConfidence >= env.ALERT_THRESHOLD_HIGH) {
    severity = 'high';
    const topPest = detections.find(d => d.confidence >= env.ALERT_THRESHOLD_HIGH);
    message = `Hama "${topPest.class_name}" terdeteksi dengan confidence tinggi (${(topPest.confidence * 100).toFixed(1)}%). Periksa tanaman segera.`;
  } else if (maxConfidence >= env.ALERT_THRESHOLD_MEDIUM) {
    severity = 'medium';
    const topPest = detections.find(d => d.confidence >= env.ALERT_THRESHOLD_MEDIUM);
    message = `Kemungkinan hama "${topPest.class_name}" terdeteksi (confidence: ${(topPest.confidence * 100).toFixed(1)}%). Perlu verifikasi.`;
  } else if (maxConfidence >= env.ALERT_THRESHOLD_LOW) {
    severity = 'low';
    message = `Deteksi hama dengan confidence rendah (${(maxConfidence * 100).toFixed(1)}%). Monitoring lanjutan disarankan.`;
  }

  // No alert needed
  if (!severity) return null;

  try {
    const alert = await alertRepo.create({
      detectionLogId,
      severity,
      message,
    });

    logger.info(`[ALERT] Created ${severity} alert #${alert.id} for log #${detectionLogId}`);
    return alert;
  } catch (err) {
    // Alert creation failure should NOT crash the detection pipeline
    logger.error(`[ALERT] Failed to create alert for log #${detectionLogId}:`, err.message);
    return null;
  }
}

/**
 * Get alerts with filtering and pagination.
 * Delegates directly to repository.
 */
export async function getAlerts(filters) {
  return alertRepo.findAll(filters);
}

/**
 * Get alert count by status (for badge counts).
 */
export async function getAlertCounts() {
  return alertRepo.countByStatus();
}

/**
 * Acknowledge an alert by ID.
 */
export async function acknowledgeAlert(alertId) {
  return alertRepo.acknowledge(alertId);
}

/**
 * Resolve an alert by ID.
 */
export async function resolveAlert(alertId) {
  return alertRepo.resolve(alertId);
}

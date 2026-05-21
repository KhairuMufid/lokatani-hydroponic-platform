/**
 * Dashboard Service
 *
 * Business logic for the frontend Dashboard page.
 * Aggregates multiple data sources into a single summary payload,
 * now including session-based metrics for the precision agriculture upgrade.
 *
 * @module services/dashboardService
 */

import * as dashboardRepo from '../repositories/dashboardRepo.js';

/**
 * Get the full dashboard summary in one call (session-aware).
 * @returns {Promise<Object>}
 */
export async function getSummary() {
  const [stats, alerts, topPest, sessionStats, latestSession] = await Promise.all([
    dashboardRepo.getSummary(),
    dashboardRepo.getAlertSummary(),
    dashboardRepo.getTopPest(),
    dashboardRepo.getSessionSummary(),
    dashboardRepo.getLatestSession(),
  ]);

  return {
    // Legacy frame-based metrics (kept for QoS research)
    total_detections_today: stats.total_detections_today,
    total_pests_today: stats.total_pests_today,
    avg_latency_ms: stats.avg_latency_ms,
    last_detection_at: stats.last_detection_at,

    // Alert metrics
    active_alerts: alerts.active_count,
    most_recent_alert: alerts.most_recent,
    top_pest: topPest,
    uptime: process.uptime(),

    // Session-based metrics (precision agriculture)
    sessions: {
      total_today: sessionStats.total_sessions_today,
      unique_pests_today: sessionStats.total_unique_pests_today,
      raw_detections_today: sessionStats.total_raw_detections_today,
      total_frames_today: sessionStats.total_frames_today,
      dedup_ratio: sessionStats.overall_dedup_ratio,
      latest: latestSession,
    },
  };
}

/**
 * Get detection trend over N days.
 * @param {number} days
 * @returns {Promise<Array>}
 */
export async function getTrend(days = 7) {
  return dashboardRepo.getTrend(days);
}

/**
 * Get the most recent detection log entry.
 * @returns {Promise<Object|null>}
 */
export async function getLatestDetection() {
  return dashboardRepo.getLatestDetection();
}

/**
 * Get paginated session history.
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
export async function getSessionHistory(opts) {
  return dashboardRepo.getSessionHistory(opts);
}

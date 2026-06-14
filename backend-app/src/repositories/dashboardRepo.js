/**
 * Dashboard Repository
 *
 * Data access layer for aggregated dashboard queries.
 * Provides summary statistics, session-based metrics,
 * and time-bucketed trend data.
 *
 * @module repositories/dashboardRepo
 */

import { query } from '../config/database.js';

/**
 * Get today's aggregated dashboard summary (session-aware).
 * @returns {Promise<Object>}
 */
export async function getSummary() {
  const sql = `
    SELECT
      COUNT(CASE WHEN is_empty_detection = FALSE THEN 1 END)::int AS total_detections_today,
      COALESCE(SUM(CASE WHEN is_empty_detection = FALSE THEN total_detections END), 0)::int AS total_pests_today,
      ROUND(AVG(latency_ms)::numeric, 2) AS avg_latency_ms,
      MAX(CASE WHEN is_empty_detection = FALSE THEN created_at END) AS last_detection_at
    FROM tb_detection_log
    WHERE created_at >= CURRENT_DATE
  `;
  const { rows } = await query(sql);
  return rows[0];
}

/**
 * Get today's session-based summary.
 * @returns {Promise<Object>}
 */
export async function getSessionSummary() {
  const sql = `
    SELECT
      COUNT(*)::int AS total_sessions_today,
      COALESCE(SUM(unique_pests), 0)::int AS total_unique_pests_today,
      COALESCE(SUM(raw_detections), 0)::int AS total_raw_detections_today,
      COALESCE(SUM(total_frames), 0)::int AS total_frames_today,
      ROUND(
        CASE WHEN SUM(raw_detections) > 0
             THEN ((1.0 - SUM(unique_pests)::numeric / SUM(raw_detections)) * 100)
             ELSE 0 END
      , 1)::real AS overall_dedup_ratio
    FROM tb_scan_session
    WHERE created_at >= CURRENT_DATE
      AND status = 'completed'
  `;
  const { rows } = await query(sql);
  return rows[0];
}

/**
 * Get the most recent completed session.
 * @returns {Promise<Object|null>}
 */
export async function getLatestSession() {
  const sql = `
    SELECT id, started_at, ended_at, protokol,
           total_frames, raw_detections, unique_pests,
           dedup_ratio, pest_summary, created_at
    FROM tb_scan_session
    WHERE status = 'completed'
    ORDER BY ended_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql);
  return rows[0] || null;
}

/**
 * Get paginated session history.
 * @param {Object} opts
 * @param {number} opts.limit
 * @param {number} opts.offset
 * @returns {Promise<{sessions: Array, total: number}>}
 */
export async function getSessionHistory({ limit = 20, offset = 0 } = {}) {
  const countSql = `SELECT COUNT(*)::int AS total FROM tb_scan_session WHERE status = 'completed'`;
  const dataSql = `
    SELECT id, started_at, ended_at, protokol,
           total_frames, raw_detections, unique_pests,
           dedup_ratio, pest_summary, created_at
    FROM tb_scan_session
    WHERE status = 'completed'
    ORDER BY ended_at DESC
    LIMIT $1 OFFSET $2
  `;
  const [countRes, dataRes] = await Promise.all([
    query(countSql),
    query(dataSql, [limit, offset]),
  ]);
  return {
    sessions: dataRes.rows,
    total: countRes.rows[0].total,
  };
}

/**
 * Get active alert count and most recent alert.
 * @returns {Promise<Object>}
 */
export async function getAlertSummary() {
  const countSql = `
    SELECT COUNT(*)::int AS active_count
    FROM tb_alert
    WHERE status = 'active'
  `;
  const recentSql = `
    SELECT id, severity, message, created_at
    FROM tb_alert
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const [countResult, recentResult] = await Promise.all([
    query(countSql),
    query(recentSql),
  ]);
  return {
    active_count: countResult.rows[0].active_count,
    most_recent: recentResult.rows[0] || null,
  };
}

/**
 * Get the most frequently detected pest name.
 * @returns {Promise<Object|null>}
 */
export async function getTopPest() {
  const sql = `
    SELECT h.nama_hama, COUNT(*)::int AS detection_count
    FROM tb_detection_detail dd
    JOIN tb_hama h ON h.id = dd.hama_id
    JOIN tb_detection_log dl ON dl.id = dd.detection_log_id
    WHERE dl.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY h.nama_hama
    ORDER BY detection_count DESC
    LIMIT 1
  `;
  const { rows } = await query(sql);
  return rows[0] || null;
}

/**
 * Get detection trend bucketed by day for the last N days.
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>}
 */
export async function getTrend(days = 7) {
  const sql = `
    SELECT
      DATE(created_at) AS date,
      protokol,
      COUNT(*)::int AS count,
      COALESCE(SUM(total_detections), 0)::int AS pest_count
    FROM tb_detection_log
    WHERE created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
      AND is_empty_detection = FALSE
    GROUP BY DATE(created_at), protokol
    ORDER BY date ASC, protokol
  `;
  const { rows } = await query(sql, [days]);
  return rows;
}

/**
 * Get the latest detection log entry (for HTTP polling fallback).
 * @returns {Promise<Object|null>}
 */
export async function getLatestDetection() {
  const sql = `
    SELECT id, protokol, waktu_kirim, waktu_terima, latency_ms,
           image_path, total_detections, metadata, created_at
    FROM tb_detection_log
    WHERE is_empty_detection = FALSE
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql);
  return rows[0] || null;
}

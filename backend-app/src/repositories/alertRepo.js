/**
 * Alert Repository
 *
 * Data access layer for tb_alert table.
 * Handles CRUD operations for the notification/alert system.
 *
 * @module repositories/alertRepo
 */

import { query } from '../config/database.js';

/**
 * Create a new alert record.
 * @param {Object} data
 * @param {bigint} data.detectionLogId - FK to tb_detection_log
 * @param {string} data.severity       - 'low' | 'medium' | 'high' | 'critical'
 * @param {string} data.message        - Human-readable alert text
 * @returns {Promise<Object>} The inserted alert row
 */
export async function create({ detectionLogId, severity, message }) {
  const sql = `
    INSERT INTO tb_alert (detection_log_id, severity, message)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const { rows } = await query(sql, [detectionLogId, severity, message]);
  return rows[0];
}

/**
 * Get alerts with optional filtering by status/severity and pagination.
 * JOINs with detection_log for protocol and image context.
 *
 * @param {Object} [opts]
 * @param {string} [opts.status]   - Filter by alert status
 * @param {string} [opts.severity] - Filter by severity level
 * @param {number} [opts.limit]    - Page size (default 50)
 * @param {number} [opts.offset]   - Offset for pagination (default 0)
 * @returns {Promise<Array>}
 */
export async function findAll({ status, severity, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`a.status = $${paramIdx++}`);
    params.push(status);
  }
  if (severity) {
    conditions.push(`a.severity = $${paramIdx++}`);
    params.push(severity);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT a.*, dl.protokol, dl.image_path, dl.total_detections
    FROM tb_alert a
    LEFT JOIN tb_detection_log dl ON dl.id = a.detection_log_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx}
  `;
  params.push(limit, offset);

  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Count alerts grouped by status (for frontend badge counts).
 * @returns {Promise<Object>} e.g. { active: 12, acknowledged: 5, resolved: 30 }
 */
export async function countByStatus() {
  const sql = `
    SELECT status, COUNT(*)::int AS count
    FROM tb_alert
    GROUP BY status
  `;
  const { rows } = await query(sql);
  return rows.reduce((acc, row) => ({ ...acc, [row.status]: row.count }), {});
}

/**
 * Acknowledge an alert by ID. Only updates if currently 'active'.
 * @param {number} alertId
 * @returns {Promise<Object|null>} Updated row, or null if not found/already ack'd
 */
export async function acknowledge(alertId) {
  const sql = `
    UPDATE tb_alert
    SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status = 'active'
    RETURNING *
  `;
  const { rows } = await query(sql, [alertId]);
  return rows[0] || null;
}

/**
 * Resolve an alert by ID. Works on both 'active' and 'acknowledged' alerts.
 * @param {number} alertId
 * @returns {Promise<Object|null>} Updated row, or null if not found/already resolved
 */
export async function resolve(alertId) {
  const sql = `
    UPDATE tb_alert
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status IN ('active', 'acknowledged')
    RETURNING *
  `;
  const { rows } = await query(sql, [alertId]);
  return rows[0] || null;
}

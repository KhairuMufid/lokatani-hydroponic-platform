/**
 * Telemetry Repository
 *
 * Data access layer for reading historical detection logs.
 * Provides paginated queries, QoS statistics (AVG/MIN/MAX/P95/P99 latency),
 * and per-log detail lookups.
 *
 * @module repositories/telemetryRepo
 */

import { query } from '../config/database.js';

/**
 * Get paginated detection logs with optional protocol and date filters.
 *
 * @param {Object} [opts]
 * @param {string} [opts.protokol]  - Filter by protocol ('HTTP','WS','MQTT')
 * @param {number} [opts.limit]     - Page size (default 50)
 * @param {number} [opts.offset]    - Offset (default 0)
 * @param {string} [opts.startDate] - ISO date lower bound
 * @param {string} [opts.endDate]   - ISO date upper bound
 * @returns {Promise<Array>}
 */
export async function findLogs({ protokol, limit = 50, offset = 0, startDate, endDate } = {}) {
  const conditions = ['is_empty_detection = FALSE'];
  const params = [];
  let idx = 1;

  if (protokol) { conditions.push(`protokol = $${idx++}`); params.push(protokol); }
  if (startDate) { conditions.push(`created_at >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`created_at <= $${idx++}`); params.push(endDate); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT id, protokol, waktu_kirim, waktu_terima, latency_ms,
           image_path, total_detections, metadata, created_at
    FROM tb_detection_log
    ${where}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;
  params.push(limit, offset);

  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Count total detection logs (for pagination metadata).
 *
 * @param {Object} [opts] - Same filters as findLogs
 * @returns {Promise<number>}
 */
export async function countLogs({ protokol, startDate, endDate } = {}) {
  const conditions = ['is_empty_detection = FALSE'];
  const params = [];
  let idx = 1;

  if (protokol) { conditions.push(`protokol = $${idx++}`); params.push(protokol); }
  if (startDate) { conditions.push(`created_at >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`created_at <= $${idx++}`); params.push(endDate); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `SELECT COUNT(*)::int AS total FROM tb_detection_log ${where}`;
  const { rows } = await query(sql, params);
  return rows[0].total;
}

/**
 * Get QoS latency statistics grouped by protocol.
 * Includes AVG, MIN, MAX, STDDEV, P50, P95, P99 — the full QoS metrics suite.
 *
 * @param {Object} [opts] - Same filters as findLogs (minus pagination)
 * @returns {Promise<Array>}
 */
export async function getStats({ protokol, startDate, endDate } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (protokol) { conditions.push(`protokol = $${idx++}`); params.push(protokol); }
  if (startDate) { conditions.push(`created_at >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`created_at <= $${idx++}`); params.push(endDate); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      protokol,
      COUNT(*)::int                                                       AS total_frames,
      ROUND(AVG(latency_ms)::numeric, 2)                                 AS avg_latency_ms,
      ROUND(MIN(latency_ms)::numeric, 2)                                 AS min_latency_ms,
      ROUND(MAX(latency_ms)::numeric, 2)                                 AS max_latency_ms,
      ROUND(STDDEV(latency_ms)::numeric, 2)                              AS stddev_latency_ms,
      ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS median_latency_ms,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p95_latency_ms,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p99_latency_ms,
      SUM(total_detections)::int                                          AS total_pest_detections,
      MIN(created_at)                                                     AS first_log,
      MAX(created_at)                                                     AS last_log
    FROM tb_detection_log
    ${where}
    GROUP BY protokol
    ORDER BY protokol
  `;

  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Get detection details for a specific log entry (with pest name JOIN).
 *
 * @param {number} logId
 * @returns {Promise<Array>}
 */
export async function findDetailsByLogId(logId) {
  const sql = `
    SELECT
      dd.id, dd.confidence, dd.bbox,
      h.id AS hama_id, h.nama_hama, h.deskripsi AS hama_deskripsi
    FROM tb_detection_detail dd
    LEFT JOIN tb_hama h ON h.id = dd.hama_id
    WHERE dd.detection_log_id = $1
    ORDER BY dd.confidence DESC
  `;
  const { rows } = await query(sql, [logId]);
  return rows;
}

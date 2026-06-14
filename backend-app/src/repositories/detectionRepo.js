/**
 * Detection Log Repository
 *
 * Data access layer for tb_detection_log and tb_detection_detail tables.
 * Handles single-row log inserts and efficient multi-row detail batch inserts.
 *
 * @module repositories/detectionRepo
 */

import { query } from '../config/database.js';

/**
 * Insert a detection log entry (pest detected). Returns the inserted row with generated id and latency.
 *
 * @param {Object} data
 * @param {string} data.protokol      - 'HTTP' | 'WS' | 'MQTT'
 * @param {Date}   data.waktuKirim    - ISO timestamp from edge device
 * @param {Date}   data.waktuTerima   - Server receive timestamp
 * @param {string} data.imagePath     - Relative path to saved JPEG
 * @param {number} data.totalDetections - Count of objects in frame
 * @param {Object} [data.metadata]    - Optional extra fields
 * @param {number} [data.scanSessionId] - Optional scan session ID
 * @returns {Promise<{id: bigint, latency_ms: number, created_at: Date}>}
 */
export async function insertLog({ protokol, waktuKirim, waktuTerima, imagePath, totalDetections, metadata, scanSessionId }) {
  const sql = `
    INSERT INTO tb_detection_log
      (protokol, waktu_kirim, waktu_terima, image_path, total_detections, is_empty_detection, metadata, scan_session_id)
    VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7)
    RETURNING id, latency_ms, created_at
  `;
  const { rows } = await query(sql, [
    protokol,
    waktuKirim,
    waktuTerima,
    imagePath,
    totalDetections,
    metadata ? JSON.stringify(metadata) : '{}',
    scanSessionId || null,
  ]);
  return rows[0];
}

/**
 * Insert a lightweight QoS-only log entry for frames with no unique pest detections.
 *
 * PURPOSE: Ensures EVERY payload received by the server has its transmission
 * timestamps (waktu_kirim, waktu_terima) recorded in the database, even when
 * no new pests are detected. This is critical for accurate QoS latency
 * measurement across all 3-second intervals.
 *
 * STORAGE SAFETY: No image is saved to disk (image_path = NULL).
 * The raw Base64 string is NEVER stored in the database.
 *
 * @param {Object} data
 * @param {string} data.protokol       - 'HTTP' | 'WS' | 'MQTT'
 * @param {Date}   data.waktuKirim     - ISO timestamp from edge device
 * @param {Date}   data.waktuTerima    - Server receive timestamp
 * @param {number} data.totalDetections - Count of detected objects (pre-dedup)
 * @param {Object} [data.metadata]     - Optional extra fields (session/frame info)
 * @param {number} [data.scanSessionId] - Active scan session ID
 * @returns {Promise<{id: bigint, latency_ms: number, created_at: Date}>}
 */
export async function insertEmptyLog({ protokol, waktuKirim, waktuTerima, totalDetections, metadata, scanSessionId }) {
  const sql = `
    INSERT INTO tb_detection_log
      (protokol, waktu_kirim, waktu_terima, image_path, total_detections, is_empty_detection, metadata, scan_session_id)
    VALUES ($1, $2, $3, NULL, $4, TRUE, $5, $6)
    RETURNING id, latency_ms, created_at
  `;
  const { rows } = await query(sql, [
    protokol,
    waktuKirim,
    waktuTerima,
    totalDetections,
    metadata ? JSON.stringify(metadata) : '{}',
    scanSessionId || null,
  ]);
  return rows[0];
}

/**
 * Batch insert detection details for a single log entry.
 * Uses a single multi-row INSERT statement for efficiency.
 *
 * @param {bigint} detectionLogId - Parent log ID
 * @param {Array<{hama_id: number|null, confidence: number, bbox: Array}>} details
 * @returns {Promise<Array<{id: bigint}>>}
 */
export async function insertDetails(detectionLogId, details) {
  if (!details.length) return [];

  const values = [];
  const params = [];
  let paramIdx = 1;

  for (const detail of details) {
    values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3})`);
    params.push(
      detectionLogId,
      detail.hama_id,
      detail.confidence,
      JSON.stringify(detail.bbox || []),
    );
    paramIdx += 4;
  }

  const sql = `
    INSERT INTO tb_detection_detail (detection_log_id, hama_id, confidence, bbox)
    VALUES ${values.join(', ')}
    RETURNING id
  `;
  const { rows } = await query(sql, params);
  return rows;
}

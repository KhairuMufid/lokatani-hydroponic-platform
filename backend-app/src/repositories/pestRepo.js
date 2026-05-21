/**
 * Pest Master Data Repository
 *
 * Data access layer for tb_hama and tb_penanganan tables.
 * Provides pest lookups and DSS mitigation joins.
 *
 * @module repositories/pestRepo
 */

import { query } from '../config/database.js';

/**
 * Look up pest records by an array of class names (from YOLO detections).
 * @param {string[]} classNames - e.g. ['kutu_daun', 'ulat_grayak']
 * @returns {Promise<Array<{id: number, nama_hama: string}>>}
 */
export async function lookupByNames(classNames) {
  if (!classNames.length) return [];

  const placeholders = classNames.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `SELECT id, nama_hama FROM tb_hama WHERE nama_hama IN (${placeholders})`;
  const { rows } = await query(sql, classNames);
  return rows;
}

/**
 * Get all pest records with descriptions.
 * @returns {Promise<Array>}
 */
export async function getAll() {
  const sql = `
    SELECT id, nama_hama, deskripsi, gejala, created_at
    FROM tb_hama
    ORDER BY nama_hama
  `;
  const { rows } = await query(sql);
  return rows;
}

/**
 * Get DSS mitigations for a specific pest by name.
 * JOINs tb_hama with tb_penanganan.
 * @param {string} pestName
 * @returns {Promise<Array>}
 */
export async function getMitigationsByPestName(pestName) {
  const sql = `
    SELECT
      h.id AS hama_id, h.nama_hama, h.deskripsi AS hama_deskripsi, h.gejala,
      p.id AS penanganan_id, p.jenis, p.deskripsi, p.bahan, p.instruksi
    FROM tb_hama h
    LEFT JOIN tb_penanganan p ON p.hama_id = h.id
    WHERE h.nama_hama = $1
    ORDER BY p.jenis
  `;
  const { rows } = await query(sql, [pestName]);
  return rows;
}

/**
 * Get DSS mitigations for multiple pests by their IDs.
 * Used after detection to return DSS data for all detected pests.
 * @param {number[]} pestIds
 * @returns {Promise<Array>}
 */
export async function getMitigationsByPestIds(pestIds) {
  if (!pestIds.length) return [];

  const placeholders = pestIds.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `
    SELECT
      h.id AS hama_id, h.nama_hama,
      p.id AS penanganan_id, p.jenis, p.deskripsi, p.bahan, p.instruksi
    FROM tb_hama h
    LEFT JOIN tb_penanganan p ON p.hama_id = h.id
    WHERE h.id IN (${placeholders})
    ORDER BY h.nama_hama, p.jenis
  `;
  const { rows } = await query(sql, pestIds);
  return rows;
}

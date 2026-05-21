/**
 * DSS (Decision Support System) Service
 *
 * Business logic for retrieving pest information and
 * mitigation action plans from the DSS knowledge base.
 *
 * @module services/dssService
 */

import * as pestRepo from '../repositories/pestRepo.js';

/**
 * Group raw JOIN rows into a structured DSS response.
 * @param {Array} rows - Raw rows from pestRepo
 * @returns {Object} Structured pest info with grouped mitigations
 */
function formatDssResponse(rows) {
  if (!rows.length) return null;

  const first = rows[0];
  const pest = {
    hama_id: first.hama_id,
    nama_hama: first.nama_hama,
    deskripsi: first.hama_deskripsi || null,
    gejala: first.gejala || null,
    penanganan: {
      preventif: [],
      kuratif: [],
    },
  };

  for (const row of rows) {
    if (!row.penanganan_id) continue;

    const action = {
      id: row.penanganan_id,
      deskripsi: row.deskripsi,
      bahan: row.bahan,
      instruksi: row.instruksi,
    };

    if (row.jenis === 'preventif') {
      pest.penanganan.preventif.push(action);
    } else if (row.jenis === 'kuratif') {
      pest.penanganan.kuratif.push(action);
    }
  }

  return pest;
}

/**
 * Get DSS mitigations for a specific pest by name.
 * @param {string} pestName - e.g. 'kutu_daun'
 * @returns {Promise<Object|null>} Structured DSS response or null if pest not found
 */
export async function getMitigations(pestName) {
  const rows = await pestRepo.getMitigationsByPestName(pestName);
  return formatDssResponse(rows);
}

/**
 * Get all pests in the knowledge base.
 * @returns {Promise<Array>}
 */
export async function getAllPests() {
  return pestRepo.getAll();
}

/**
 * Detection Service
 *
 * Core business logic for the pest detection ingestion pipeline.
 * Orchestrates: validation → session check → confidence gate → dedup →
 *               conditional image save → pest lookup → DB writes → alert eval.
 *
 * PIPELINE STAGES:
 *   0. Session Validation: REQUIRE explicit active session (no auto-create)
 *   1. Confidence Gate: Filter detections below MIN_CONFIDENCE threshold
 *   2. Centroid Dedup: Euclidean distance tracking to eliminate double-counting
 *   3. Conditional Persist: Only save to disk/DB if unique pests remain
 *
 * @module services/detectionService
 */

import * as pestRepo from '../repositories/pestRepo.js';
import * as detectionRepo from '../repositories/detectionRepo.js';
import * as alertService from './alertService.js';
import * as sessionManager from './sessionManager.js';
import { saveBase64Image } from '../utils/imageProcessor.js';
import { captureReceiveTime, calculateLatencyMs } from '../utils/timestampHelper.js';
import { setLatestFrame } from '../utils/latestFrameBuffer.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/** Global in-memory cache for DSS data (Zero DB overhead for Branch A) */
const globalDssCache = new Map();

/** Per-session pest class counters for pest_summary */
const sessionPestSummaries = new Map();

// Register session completion handler (persist pest summary + cleanup)
sessionManager.onComplete(async (session) => {
  try {
    const summary = sessionPestSummaries.get(session.id) || {};
    await sessionManager.updatePestSummary(session.id, summary);
    sessionPestSummaries.delete(session.id);
  } catch (err) {
    logger.error(`[DETECT] Failed to finalize session #${session.id}:`, err.message);
  }
});

/**
 * Group raw DSS rows into a pest-keyed structure for the frontend.
 */
function groupDssByPest(dssRows) {
  const map = new Map();
  for (const row of dssRows) {
    if (!map.has(row.hama_id)) {
      map.set(row.hama_id, {
        hama_id: row.hama_id,
        nama_hama: row.nama_hama,
        penanganan: [],
      });
    }
    if (row.penanganan_id) {
      map.get(row.hama_id).penanganan.push({
        id: row.penanganan_id,
        jenis: row.jenis,
        deskripsi: row.deskripsi,
        bahan: row.bahan,
        instruksi: row.instruksi,
      });
    }
  }
  return [...map.values()];
}

/**
 * Process an incoming detection payload.
 *
 * PIPELINE:
 *   0. Validate payload + REQUIRE scan_session_id (explicit session)
 *   1. Capture receive time (QoS)
 *   2. Confidence gate (filter low-quality detections)
 *   3. Centroid dedup (eliminate double-counting across scan points)
 *   4. BRANCH A (no unique pests) → PASSTHROUGH
 *   5. BRANCH B (has unique pests) → FULL PIPELINE
 *
 * @param {Object} payload  - JSON payload from edge device
 * @param {string} protokol - 'HTTP' | 'WS' | 'MQTT'
 * @returns {Promise<Object>} Structured result with live feed data
 */
export async function processDetection(payload, protokol) {
  // ⏱ CRITICAL: Capture receive time FIRST — before ANY I/O
  const waktuTerima = captureReceiveTime();

  // --- Validate payload ---
  if (!payload.timestamp || !payload.image_base64) {
    const err = new Error('Missing required fields: timestamp, image_base64');
    err.statusCode = 400;
    throw err;
  }

  // ─── STAGE 0: Explicit Session Validation ───────────
  // The backend REQUIRES an active session. No auto-creation.
  const scanSessionId = payload.scan_session_id;
  if (!scanSessionId) {
    const err = new Error(
      'Missing required field: scan_session_id. ' +
      'Send a start_session signal before transmitting telemetry.'
    );
    err.statusCode = 400;
    throw err;
  }

  const sessionCheck = await sessionManager.validateSession(scanSessionId);
  if (!sessionCheck) {
    logger.warn(
      `[DETECT] ⚠️ REJECTED telemetry for session #${scanSessionId} — ` +
      `no active session found. Possible ESP32/RPi desync.`
    );
    const err = new Error(
      `Session #${scanSessionId} is not active. ` +
      `Ensure start_session was called and the session has not been ended.`
    );
    err.statusCode = 403;
    throw err;
  }

  // Advance frame counter for this session
  const frameIndex = await sessionManager.advanceFrame(scanSessionId);

  const waktuKirim = new Date(payload.timestamp);
  const rawDetections = Array.isArray(payload.detections) ? payload.detections : [];
  const latencyMs = calculateLatencyMs(waktuKirim, waktuTerima);

  // ─── STAGE 1: Confidence Gate ──────────────────────
  const minConfidence = payload.min_confidence ?? env.MIN_CONFIDENCE;
  const filteredDetections = rawDetections.filter(
    (d) => d.confidence >= minConfidence
  );

  // ─── STAGE 2: Session Tracking ───────────────────────
  const uniqueDetections = filteredDetections;
  const newUniqueCount = filteredDetections.length;
  const rawCount = filteredDetections.length;

  if (filteredDetections.length > 0) {
    if (!sessionPestSummaries.has(scanSessionId)) {
      sessionPestSummaries.set(scanSessionId, {});
    }
    const summary = sessionPestSummaries.get(scanSessionId);
    for (const d of filteredDetections) {
      const className = d.class_name;
      if (className) {
        summary[className] = (summary[className] || 0) + 1;
      }
    }
  }

  // Update session counters
  await sessionManager.updateSessionCounters(scanSessionId, rawCount, newUniqueCount);

  // ═══ BRANCH A: No unique pests → QoS LOG + PASSTHROUGH ═══
  // Even without unique pests, we MUST log the timestamps for continuous
  // QoS latency measurement. No image is saved to disk or database.
  if (uniqueDetections.length === 0) {
    const activePestNames = [...new Set(filteredDetections.map(d => d.class_name).filter(Boolean))];
    const cachedDssData = [];
    for (const pestName of activePestNames) {
      if (globalDssCache.has(pestName)) {
        cachedDssData.push(globalDssCache.get(pestName));
      }
    }

    // ── QoS Timestamp Persistence (lightweight — no image saved) ──
    const emptyLogRow = await detectionRepo.insertEmptyLog({
      protokol,
      waktuKirim,
      waktuTerima,
      totalDetections: filteredDetections.length,
      metadata: { scan_session_id: scanSessionId, frame_index: frameIndex },
      scanSessionId: scanSessionId,
    });

    const result = {
      success: true,
      log_id: emptyLogRow.id,
      latency_ms: emptyLogRow.latency_ms,
      image_base64: payload.image_base64,
      image_path: null,
      total_detections: filteredDetections.length,
      detections: filteredDetections,
      unique_pests: 0,
      details_inserted: 0,
      alert: null,
      dss: cachedDssData,
      created_at: emptyLogRow.created_at,
      scan_session_id: scanSessionId,
      frame_index: frameIndex,
      dedup: {
        raw: rawCount,
        unique_new: 0,
        filtered_by_confidence: rawDetections.length - filteredDetections.length,
      },
    };

    setLatestFrame(result);

    logger.debug(
      `[DETECT] ${protokol} | S#${scanSessionId} F${frameIndex} | EMPTY log #${emptyLogRow.id} | ` +
      `${emptyLogRow.latency_ms}ms | ${rawDetections.length}→${filteredDetections.length}→0 unique`
    );

    return result;
  }

  // ═══ BRANCH B: Has unique pests → FULL PIPELINE ═══
  const classNames = [...new Set(
    uniqueDetections.map(d => d.class_name).filter(Boolean)
  )];

  const [imagePath, pestRecords] = await Promise.all([
    saveBase64Image(payload.image_base64),
    pestRepo.lookupByNames(classNames),
  ]);

  const pestMap = new Map(pestRecords.map(p => [p.nama_hama, p.id]));

  const enrichedDetails = uniqueDetections.map(d => ({
    hama_id: pestMap.get(d.class_name) || null,
    confidence: d.confidence || 0,
    bbox: d.bbox || [],
  }));

  const logRow = await detectionRepo.insertLog({
    protokol,
    waktuKirim,
    waktuTerima,
    imagePath,
    totalDetections: uniqueDetections.length,
    metadata: { scan_session_id: scanSessionId, frame_index: frameIndex },
    scanSessionId: scanSessionId,
  });

  const [detailRows, alertRow] = await Promise.all([
    detectionRepo.insertDetails(logRow.id, enrichedDetails),
    alertService.evaluateAndCreate(logRow.id, uniqueDetections, pestMap),
  ]);

  const uniquePestIds = [...new Set(
    enrichedDetails.map(d => d.hama_id).filter(Boolean)
  )];

  if (uniquePestIds.length > 0) {
    const dssRows = await pestRepo.getMitigationsByPestIds(uniquePestIds);
    const grouped = groupDssByPest(dssRows);
    for (const dss of grouped) {
      if (dss.nama_hama) {
        globalDssCache.set(dss.nama_hama, dss);
      }
    }
  }

  const activePestNames = [...new Set(filteredDetections.map(d => d.class_name).filter(Boolean))];
  const finalDssData = [];
  for (const pestName of activePestNames) {
    if (globalDssCache.has(pestName)) {
      finalDssData.push(globalDssCache.get(pestName));
    }
  }

  const result = {
    success: true,
    log_id: logRow.id,
    latency_ms: logRow.latency_ms,
    image_base64: payload.image_base64,
    image_path: imagePath,
    total_detections: uniqueDetections.length,
    detections: filteredDetections,
    unique_pests: newUniqueCount,
    details_inserted: detailRows.length,
    alert: alertRow || null,
    dss: finalDssData,
    created_at: logRow.created_at,
    scan_session_id: scanSessionId,
    frame_index: frameIndex,
    dedup: {
      raw: rawCount,
      unique_new: newUniqueCount,
      filtered_by_confidence: rawDetections.length - filteredDetections.length,
    },
  };

  setLatestFrame(result);

  logger.debug(
    `[DETECT] ${protokol} | S#${scanSessionId} F${frameIndex} | log #${logRow.id} | ` +
    `${logRow.latency_ms}ms | ${rawDetections.length}→${filteredDetections.length}→${newUniqueCount} unique | ` +
    `alert: ${alertRow ? alertRow.severity : 'none'}`
  );

  return result;
}

/**
 * Detection Service
 *
 * Core business logic for the pest detection ingestion pipeline.
 * Orchestrates: validation → confidence gate → session → dedup →
 *               conditional image save → pest lookup → DB writes → alert eval.
 *
 * PIPELINE STAGES:
 *   1. Confidence Gate: Filter detections below MIN_CONFIDENCE threshold
 *   2. Session Manager: Group frames into scan sessions via gap detection
 *   3. Centroid Dedup: Euclidean distance tracking to eliminate double-counting
 *   4. Conditional Persist: Only save to disk/DB if unique pests remain
 *
 * This is the HEART of the QoS measurement system.
 *
 * @module services/detectionService
 */

import * as pestRepo from '../repositories/pestRepo.js';
import * as detectionRepo from '../repositories/detectionRepo.js';
import * as alertService from './alertService.js';
import * as sessionManager from './sessionManager.js';
import { processDedup, getPestSummary, clearSession, clearSessionSummary } from './dedupService.js';
import { saveBase64Image } from '../utils/imageProcessor.js';
import { captureReceiveTime, calculateLatencyMs } from '../utils/timestampHelper.js';
import { setLatestFrame } from '../utils/latestFrameBuffer.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/** Global in-memory cache for DSS data (Zero DB overhead for Branch A) */
const globalDssCache = new Map();

// Register session completion handler (persist pest summary + cleanup)
sessionManager.onComplete(async (session) => {
  try {
    const summary = getPestSummary(session.id);
    await sessionManager.updatePestSummary(session.id, summary);
    clearSession(session.id);
    clearSessionSummary(session.id);
  } catch (err) {
    logger.error(`[DETECT] Failed to finalize session #${session.id}:`, err.message);
  }
});

/**
 * Group raw DSS rows into a pest-keyed structure for the frontend.
 *
 * @param {Array} dssRows - Raw JOIN rows from pestRepo
 * @returns {Array} Grouped structure: [{ hama_id, nama_hama, penanganan: [...] }]
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

    // Only add if penanganan data exists (LEFT JOIN may produce nulls)
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
 *   1. Capture receive time (QoS)
 *   2. Validate payload
 *   3. Confidence gate (filter low-quality detections)
 *   4. Session management (get or create scan session)
 *   5. Centroid dedup (eliminate double-counting from moving camera)
 *   6. BRANCH A (no unique pests) → PASSTHROUGH (no disk, no DB)
 *   7. BRANCH B (has unique pests) → FULL PIPELINE (save, persist, alert, DSS)
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

  const waktuKirim = new Date(payload.timestamp);
  const rawDetections = Array.isArray(payload.detections) ? payload.detections : [];

  // Compute latency for all frames (needed for QoS measurement)
  const latencyMs = calculateLatencyMs(waktuKirim, waktuTerima);

  // ───────────────────────────────────────────────────────
  // STAGE 1: Confidence Gate
  // Filter out low-confidence detections (motion blur artifacts)
  // ───────────────────────────────────────────────────────
  const minConfidence = payload.min_confidence ?? env.MIN_CONFIDENCE;
  const filteredDetections = rawDetections.filter(
    (d) => d.confidence >= minConfidence
  );

  // ───────────────────────────────────────────────────────
  // STAGE 2: Session Management
  // Get or create a scan session (gap-based boundary detection)
  // ───────────────────────────────────────────────────────
  const { sessionId, frameIndex } = await sessionManager.getOrCreateSession(protokol);

  // ───────────────────────────────────────────────────────
  // STAGE 3: Centroid Dedup
  // Eliminate double-counting from the sliding camera
  // ───────────────────────────────────────────────────────
  const { uniqueDetections, newUniqueCount, rawCount } = processDedup(
    sessionId,
    frameIndex,
    filteredDetections
  );

  // Update session counters (total_frames + raw + unique)
  await sessionManager.updateSessionCounters(sessionId, rawCount, newUniqueCount);

  // ═══════════════════════════════════════════════════════
  // BRANCH A: No unique pests in this frame → PASSTHROUGH
  // Skip disk I/O and DB writes entirely. Just broadcast.
  // ═══════════════════════════════════════════════════════
  if (uniqueDetections.length === 0) {
    // Populate DSS from cache for all currently visible pests
    const activePestNames = [...new Set(filteredDetections.map(d => d.class_name).filter(Boolean))];
    const cachedDssData = [];
    for (const pestName of activePestNames) {
      if (globalDssCache.has(pestName)) {
        cachedDssData.push(globalDssCache.get(pestName));
      }
    }

    const result = {
      success: true,
      log_id: `passthrough-${sessionId}-${frameIndex}`,
      latency_ms: Math.round(latencyMs * 100) / 100,
      image_base64: payload.image_base64,
      image_path: null,
      total_detections: filteredDetections.length,
      detections: filteredDetections,
      unique_pests: 0,
      details_inserted: 0,
      alert: null,
      dss: cachedDssData,
      created_at: waktuTerima.toISOString(),
      scan_session_id: sessionId,
      frame_index: frameIndex,
      dedup: {
        raw: rawCount,
        unique_new: 0,
        filtered_by_confidence: rawDetections.length - filteredDetections.length,
      },
    };

    // Cache for HTTP polling
    setLatestFrame(result);

    logger.debug(
      `[DETECT] ${protokol} | S#${sessionId} F${frameIndex} | PASSTHROUGH | ` +
      `${result.latency_ms}ms | ${rawDetections.length}→${filteredDetections.length}→0 unique`
    );

    return result;
  }

  // ═══════════════════════════════════════════════════════
  // BRANCH B: Has unique new pests → FULL PIPELINE
  // Save image, persist to DB, evaluate alerts, fetch DSS.
  // ═══════════════════════════════════════════════════════

  // Extract unique pest class names from unique detections
  const classNames = [...new Set(
    uniqueDetections.map(d => d.class_name).filter(Boolean)
  )];

  // STAGE 4: Parallel disk I/O + DB lookup (independent)
  const [imagePath, pestRecords] = await Promise.all([
    saveBase64Image(payload.image_base64),
    pestRepo.lookupByNames(classNames),
  ]);

  // Build pest name → id lookup map
  const pestMap = new Map(pestRecords.map(p => [p.nama_hama, p.id]));

  // Enrich detections with resolved hama_id
  const enrichedDetails = uniqueDetections.map(d => ({
    hama_id: pestMap.get(d.class_name) || null,
    confidence: d.confidence || 0,
    bbox: d.bbox || [],
  }));

  // STAGE 5: Insert log with session reference
  const logRow = await detectionRepo.insertLog({
    protokol,
    waktuKirim,
    waktuTerima,
    imagePath,
    totalDetections: uniqueDetections.length,
    metadata: { scan_session_id: sessionId, frame_index: frameIndex },
    scanSessionId: sessionId,
  });

  // STAGE 6: Parallel detail insert + alert evaluation
  const [detailRows, alertRow] = await Promise.all([
    detectionRepo.insertDetails(logRow.id, enrichedDetails),
    alertService.evaluateAndCreate(logRow.id, uniqueDetections, pestMap),
  ]);

  // STAGE 7: Fetch DSS for newly detected unique pests
  const uniquePestIds = [...new Set(
    enrichedDetails.map(d => d.hama_id).filter(Boolean)
  )];

  if (uniquePestIds.length > 0) {
    const dssRows = await pestRepo.getMitigationsByPestIds(uniquePestIds);
    const grouped = groupDssByPest(dssRows);
    // Update global cache with freshly fetched DSS
    for (const dss of grouped) {
      if (dss.nama_hama) {
        globalDssCache.set(dss.nama_hama, dss);
      }
    }
  }

  // Compile final DSS for ALL pests currently in frame
  const activePestNames = [...new Set(filteredDetections.map(d => d.class_name).filter(Boolean))];
  const finalDssData = [];
  for (const pestName of activePestNames) {
    if (globalDssCache.has(pestName)) {
      finalDssData.push(globalDssCache.get(pestName));
    }
  }

  // --- Build response ---
  const result = {
    success: true,
    log_id: logRow.id,
    latency_ms: logRow.latency_ms,
    image_base64: payload.image_base64,
    image_path: imagePath,
    total_detections: uniqueDetections.length,
    detections: filteredDetections,  // Echo all filtered for bounding boxes
    unique_pests: newUniqueCount,
    details_inserted: detailRows.length,
    alert: alertRow || null,
    dss: finalDssData,
    created_at: logRow.created_at,
    scan_session_id: sessionId,
    frame_index: frameIndex,
    dedup: {
      raw: rawCount,
      unique_new: newUniqueCount,
      filtered_by_confidence: rawDetections.length - filteredDetections.length,
    },
  };

  // Cache for HTTP polling
  setLatestFrame(result);

  logger.debug(
    `[DETECT] ${protokol} | S#${sessionId} F${frameIndex} | log #${logRow.id} | ` +
    `${logRow.latency_ms}ms | ${rawDetections.length}→${filteredDetections.length}→${newUniqueCount} unique | ` +
    `alert: ${alertRow ? alertRow.severity : 'none'}`
  );

  return result;
}

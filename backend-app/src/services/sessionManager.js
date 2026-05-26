/**
 * Session Manager — Explicit State Machine
 *
 * Manages scan sessions with explicit Start/End signals from the
 * Raspberry Pi edge device. Replaces the old gap-based auto-close logic.
 *
 * State Machine:
 *   IDLE → ACTIVE   : startSession(protokol)
 *   ACTIVE → ACTIVE  : frame ingested (counter update)
 *   ACTIVE → COMPLETED : endSession(sessionId)
 *
 * The backend MUST receive an explicit "Start Session" signal before
 * accepting any telemetry. Telemetry without an active session is
 * rejected with a 400/403 error.
 *
 * @module services/sessionManager
 */

import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/** @type {Map<number, Object>} Active sessions by ID */
const activeSessions = new Map();

/** @type {Array<Function>} Callbacks when session completes */
const onSessionCompleteCallbacks = [];

/**
 * Register a callback for session completion events.
 * @param {Function} cb - Called with the completed session row
 */
export function onComplete(cb) {
  onSessionCompleteCallbacks.push(cb);
}

/**
 * Start a new scan session explicitly.
 * Called when the ESP32 sends a START trigger to the Raspberry Pi,
 * which then forwards the signal to the cloud backend.
 *
 * @param {string} protokol - 'HTTP' | 'WS' | 'MQTT'
 * @returns {Promise<{ sessionId: number }>}
 */
export async function startSession(protokol) {
  const sql = `
    INSERT INTO tb_scan_session (started_at, protokol, status)
    VALUES (NOW(), $1, 'active')
    RETURNING id, started_at, protokol, status
  `;
  const { rows } = await query(sql, [protokol]);
  const session = rows[0];
  const idValue = Number(session.id); // Secure the type

  activeSessions.set(idValue, {
    ...session,
    id: idValue,
    frameIndex: 0,
  });

  logger.info(`[SESSION] ✅ Session #${idValue} STARTED (${protokol})`);
  return { sessionId: idValue };
}

/**
 * Validate that a session exists and is active.
 * Returns the session object with its current frameIndex.
 * Includes DB fallback for multi-process environments.
 *
 * @param {number} sessionId
 * @returns {Promise<{ session: Object, frameIndex: number } | null>}
 */
export async function validateSession(sessionId) {
  const id = Number(sessionId);
  let session = activeSessions.get(id);
  
  if (!session) {
    // Database fallback (for multi-process / PM2 isolation)
    const sql = `SELECT * FROM tb_scan_session WHERE id = $1 AND status = 'active'`;
    const { rows } = await query(sql, [id]);
    
    if (rows.length === 0) return null;
    
    session = { ...rows[0], id, frameIndex: rows[0].total_frames || 0 };
    activeSessions.set(id, session);
  }
  
  return { session, frameIndex: session.frameIndex };
}

/**
 * Increment the frame index for an active session.
 * Called internally by detectionService before processing a frame.
 *
 * @param {number} sessionId
 * @returns {Promise<number>} The new frame index
 */
export async function advanceFrame(sessionId) {
  const id = Number(sessionId);
  let session = activeSessions.get(id);
  
  if (!session) {
    // If not in memory, validate logic will try to fetch it
    await validateSession(id);
    session = activeSessions.get(id);
    if (!session) return 0;
  }
  
  session.frameIndex++;
  return session.frameIndex;
}

/**
 * Update session counters (called after each frame is processed).
 *
 * @param {number} sessionId
 * @param {number} rawDetectionCount - Pre-dedup detection count in this frame
 * @param {number} newUniquePests - Newly identified unique pests in this frame
 */
export async function updateSessionCounters(sessionId, rawDetectionCount, newUniquePests) {
  const sql = `
    UPDATE tb_scan_session
    SET total_frames = total_frames + 1,
        raw_detections = raw_detections + $1,
        unique_pests = unique_pests + $2
    WHERE id = $3
  `;
  await query(sql, [rawDetectionCount, newUniquePests, sessionId]);
}

/**
 * End (finalize) an active session explicitly.
 * Called when the ESP32 sends an END trigger.
 *
 * @param {number} sessionId
 * @returns {Promise<Object>} The completed session row
 * @throws {Error} If session not found or already completed
 */
export async function endSession(sessionId) {
  const id = Number(sessionId);
  let session = activeSessions.get(id);

  if (!session) {
    // Try to find it in active DB if not in memory
    const { rows } = await query(`SELECT id FROM tb_scan_session WHERE id = $1 AND status = 'active'`, [id]);
    if (rows.length === 0) {
      const err = new Error(`Session #${id} not found or already completed`);
      err.statusCode = 404;
      throw err;
    }
  }

  try {
    const sql = `
      UPDATE tb_scan_session
      SET status = 'completed', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await query(sql, [id]);
    const completedSession = rows[0];

    logger.info(
      `[SESSION] 🏁 Session #${id} COMPLETED | ` +
      `${completedSession.total_frames} frames | ` +
      `${completedSession.raw_detections} raw → ${completedSession.unique_pests} unique`
    );

    // Notify listeners (e.g., WS broadcast)
    for (const cb of onSessionCompleteCallbacks) {
      try { cb(completedSession); } catch (e) {
        logger.error(`[SESSION] Completion callback error:`, e.message);
      }
    }

    // Remove from active sessions
    activeSessions.delete(id);

    return completedSession;
  } catch (err) {
    if (err.statusCode) throw err;
    logger.error(`[SESSION] Failed to end session #${id}:`, err.message);
    throw err;
  }
}

/**
 * Update the pest_summary JSON for a session.
 * @param {number} sessionId
 * @param {Object} summary - e.g., { "kutu_daun": 3, "ulat_grayak": 1 }
 */
export async function updatePestSummary(sessionId, summary) {
  const sql = `
    UPDATE tb_scan_session SET pest_summary = $1 WHERE id = $2
  `;
  await query(sql, [JSON.stringify(summary), sessionId]);
}

/**
 * Get a specific active session by ID.
 * @param {number} sessionId
 * @returns {Object|null}
 */
export function getActiveSession(sessionId) {
  return activeSessions.get(Number(sessionId)) || null;
}

/**
 * Get all active session IDs (for diagnostics).
 * @returns {number[]}
 */
export function getActiveSessionIds() {
  return [...activeSessions.keys()];
}

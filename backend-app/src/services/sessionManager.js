/**
 * Session Manager — Gap-Based Scan Session Lifecycle
 *
 * Manages scan sessions for the moving slider camera.
 * A session represents one continuous data stream (one slider traversal).
 *
 * Boundary detection: If no frame arrives for SESSION_GAP_MS (default 5s),
 * the current session is auto-closed. The next frame starts a new session.
 *
 * @module services/sessionManager
 */

import { query } from '../config/database.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/** @type {Object|null} Current active session */
let activeSession = null;

/** @type {NodeJS.Timeout|null} Gap timeout handle */
let gapTimer = null;

/** @type {number} Frame counter within current session */
let frameIndex = 0;

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
 * Get or create the current active session.
 * Resets the gap timer on every call.
 *
 * @param {string} protokol - 'HTTP' | 'WS' | 'MQTT'
 * @returns {Promise<{sessionId: number, frameIndex: number}>}
 */
export async function getOrCreateSession(protokol) {
  // Reset gap timer
  if (gapTimer) clearTimeout(gapTimer);
  gapTimer = setTimeout(() => closeSession(), env.SESSION_GAP_MS);

  if (activeSession) {
    frameIndex++;
    return { sessionId: activeSession.id, frameIndex };
  }

  // Create new session
  const sql = `
    INSERT INTO tb_scan_session (started_at, protokol)
    VALUES (NOW(), $1)
    RETURNING id, started_at
  `;
  const { rows } = await query(sql, [protokol]);
  activeSession = rows[0];
  frameIndex = 0;

  logger.info(`[SESSION] New session #${activeSession.id} started (${protokol})`);

  return { sessionId: activeSession.id, frameIndex };
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
 * Close the current active session (triggered by gap timeout).
 */
async function closeSession() {
  if (!activeSession) return;

  const sessionId = activeSession.id;

  try {
    // Finalize session
    const sql = `
      UPDATE tb_scan_session
      SET status = 'completed', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await query(sql, [sessionId]);
    const completedSession = rows[0];

    logger.info(
      `[SESSION] Session #${sessionId} completed | ` +
      `${completedSession.total_frames} frames | ` +
      `${completedSession.raw_detections} raw → ${completedSession.unique_pests} unique`
    );

    // Notify listeners
    if (completedSession) {
      for (const cb of onSessionCompleteCallbacks) {
        cb(completedSession);
      }
    }
  } catch (err) {
    logger.error(`[SESSION] Failed to close session #${sessionId}:`, err.message);
  }

  activeSession = null;
  frameIndex = 0;
  gapTimer = null;
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
 * Get the current active session (if any).
 * @returns {Object|null}
 */
export function getActiveSession() {
  return activeSession;
}

/**
 * Get the current frame index.
 * @returns {number}
 */
export function getFrameIndex() {
  return frameIndex;
}

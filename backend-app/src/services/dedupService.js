/**
 * Deduplication Service — Centroid Tracking with Euclidean Distance
 *
 * Deduplicates pests seen across consecutive frames during a scan session.
 * Designed for a camera on a linear actuator where ALL objects shift by
 * a predictable dx per frame due to camera translation.
 *
 * Algorithm:
 *   1. Compute centroid of each detection's bounding box
 *   2. For each detection, find active tracked pests with same class_name
 *   3. Compute Euclidean distance to each, using a dynamic threshold
 *      that accounts for frame gap × per-frame camera drift
 *   4. If match found → DUPLICATE (update tracked pest position)
 *   5. If no match → NEW unique pest (add to active tracked list)
 *   6. Tracked pests expire after TEMPORAL_WINDOW frames without a match
 *
 * @module services/dedupService
 */

import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Per-session tracked pest map.
 * Key: sessionId → Array of tracked pest objects
 * @type {Map<number, Array<TrackedPest>>}
 *
 * TrackedPest: {
 *   id: number,
 *   class_name: string,
 *   cx: number,         // last known centroid X
 *   cy: number,         // last known centroid Y
 *   lastSeenFrame: number,
 *   hitCount: number    // how many raw detections matched this pest
 * }
 */
const sessionTrackers = new Map();
let nextPestId = 1;

/** Per-session pest class counters for pest_summary */
const sessionPestSummary = new Map();

/**
 * Compute Euclidean distance between two centroids.
 */
function distance(ax, ay, bx, by) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/**
 * Compute the centroid of a bounding box [x, y, w, h].
 * @param {Array<number>} bbox - [x, y, width, height]
 * @returns {{ cx: number, cy: number }}
 */
function computeCentroid(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) {
    return { cx: 0, cy: 0 };
  }
  return {
    cx: bbox[0] + bbox[2] / 2,
    cy: bbox[1] + bbox[3] / 2,
  };
}

/**
 * Process detections for deduplication within a session.
 *
 * @param {number} sessionId - Active scan session ID
 * @param {number} frameIndex - Current frame index in session
 * @param {Array} detections - Filtered detections (post-confidence gate)
 *   Each detection: { class_name, confidence, bbox: [x, y, w, h] }
 * @returns {{ uniqueDetections: Array, newUniqueCount: number, rawCount: number }}
 */
export function processDedup(sessionId, frameIndex, detections) {
  if (!sessionTrackers.has(sessionId)) {
    sessionTrackers.set(sessionId, []);
    sessionPestSummary.set(sessionId, {});
  }

  const tracked = sessionTrackers.get(sessionId);
  const summary = sessionPestSummary.get(sessionId);
  const uniqueDetections = [];
  let newUniqueCount = 0;

  // Expire old tracked pests (not seen within temporal window)
  const expireThreshold = frameIndex - env.DEDUP_TEMPORAL_WINDOW;
  const activeTracked = tracked.filter((t) => t.lastSeenFrame >= expireThreshold);
  sessionTrackers.set(sessionId, activeTracked);

  for (const detection of detections) {
    const { cx, cy } = computeCentroid(detection.bbox);
    const className = detection.class_name;

    // Find best matching tracked pest (same class, closest distance)
    let bestMatch = null;
    let bestDist = Infinity;

    for (const tp of activeTracked) {
      if (tp.class_name !== className) continue;

      const frameGap = frameIndex - tp.lastSeenFrame;

      // Dynamic threshold: base distance + camera drift over frame gap
      const dynamicThreshold =
        env.DEDUP_DISTANCE_THRESHOLD + frameGap * env.DEDUP_PER_FRAME_DRIFT;

      const dist = distance(cx, cy, tp.cx, tp.cy);

      if (dist < dynamicThreshold && dist < bestDist) {
        bestDist = dist;
        bestMatch = tp;
      }
    }

    if (bestMatch) {
      // DUPLICATE — update tracked pest position and timestamp
      bestMatch.cx = cx;
      bestMatch.cy = cy;
      bestMatch.lastSeenFrame = frameIndex;
      bestMatch.hitCount++;
    } else {
      // NEW unique pest
      const newPest = {
        id: nextPestId++,
        class_name: className,
        cx,
        cy,
        lastSeenFrame: frameIndex,
        hitCount: 1,
      };
      activeTracked.push(newPest);
      newUniqueCount++;

      // Update pest summary counter
      summary[className] = (summary[className] || 0) + 1;

      // Mark as unique for return
      uniqueDetections.push({
        ...detection,
        unique_pest_id: newPest.id,
        is_unique: true,
      });
    }
  }

  return {
    uniqueDetections,
    newUniqueCount,
    rawCount: detections.length,
  };
}

/**
 * Get the pest summary for a session.
 * @param {number} sessionId
 * @returns {Object} e.g., { "kutu_daun": 3, "ulat_grayak": 1 }
 */
export function getPestSummary(sessionId) {
  return sessionPestSummary.get(sessionId) || {};
}

/**
 * Clear tracking data for a completed session (free memory).
 * @param {number} sessionId
 */
export function clearSession(sessionId) {
  sessionTrackers.delete(sessionId);
  // Keep pest summary until explicitly cleared (needed for session completion)
}

/**
 * Clear pest summary for a session (after it's been persisted to DB).
 * @param {number} sessionId
 */
export function clearSessionSummary(sessionId) {
  sessionPestSummary.delete(sessionId);
}

/**
 * Get the number of currently tracked active pests in a session.
 * @param {number} sessionId
 * @returns {number}
 */
export function getActiveTrackedCount(sessionId) {
  const tracked = sessionTrackers.get(sessionId);
  return tracked ? tracked.length : 0;
}

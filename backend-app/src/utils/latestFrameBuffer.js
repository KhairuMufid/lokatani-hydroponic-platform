/**
 * Latest Frame Buffer — In-Memory Singleton
 *
 * Caches the most recent detection frame for HTTP polling.
 * Eliminates DB queries from the Live Monitor HTTP fallback path.
 * Updated on every processDetection() call regardless of pest count.
 *
 * @module utils/latestFrameBuffer
 */

/** @type {Object|null} */
let latestFrame = null;

/**
 * Cache the latest processed frame.
 * Called from detectionService after every ingestion.
 * @param {Object} frame - Full detection result with image_base64
 */
export function setLatestFrame(frame) {
  latestFrame = frame;
}

/**
 * Retrieve the cached latest frame.
 * Called from dashboardController for GET /api/detect/latest.
 * @returns {Object|null}
 */
export function getLatestFrame() {
  return latestFrame;
}

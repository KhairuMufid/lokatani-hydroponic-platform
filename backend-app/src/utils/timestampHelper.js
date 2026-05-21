/**
 * Timestamp Helper Utility
 *
 * Precision timing functions for QoS latency measurement.
 * waktu_terima is captured at the very first line of the controller
 * to isolate pure network transit time from processing overhead.
 *
 * CRITICAL: All calculations use UTC epoch milliseconds to avoid
 * timezone interpretation issues between mock-iot and server.
 *
 * @module utils/timestampHelper
 */

/**
 * Capture the current timestamp with millisecond precision.
 * Must be called at the VERY FIRST line of handleDetection()
 * — before any async I/O — to get the purest receive-time measurement.
 *
 * @returns {Date} Current timestamp as a Date object.
 */
export function captureReceiveTime() {
  return new Date();
}

/**
 * Calculate one-way latency in milliseconds between two timestamps.
 *
 * Uses pure UTC epoch milliseconds (Date.getTime()) to eliminate
 * any timezone interpretation discrepancies between the edge device
 * and the server.
 *
 * Negative values are clamped to 0 to handle sub-millisecond clock
 * skew on localhost (mock-iot and server share the same system clock,
 * so Date.now() can return the same or inverted ms on tight loops).
 *
 * @param {string|Date} waktuKirim  - ISO 8601 timestamp from the edge device.
 * @param {Date}        waktuTerima - Timestamp captured on the server.
 * @returns {number} Latency in milliseconds (clamped to >= 0).
 */
export function calculateLatencyMs(waktuKirim, waktuTerima) {
  const send = waktuKirim instanceof Date ? waktuKirim.getTime() : new Date(waktuKirim).getTime();
  const recv = waktuTerima instanceof Date ? waktuTerima.getTime() : new Date(waktuTerima).getTime();
  return Math.max(0, recv - send);
}

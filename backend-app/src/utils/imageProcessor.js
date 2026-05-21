/**
 * Image Processor Utility
 *
 * Decodes a Base64 data-URI string into a binary JPEG buffer and writes it
 * to the uploads/images/ directory using fully asynchronous, non-blocking I/O.
 *
 * Generates collision-proof filenames via Date.now() + crypto.randomUUID().
 * Zero external dependencies — uses only Node.js built-ins.
 *
 * @module utils/imageProcessor
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import env from '../config/env.js';

const uploadDir = env.UPLOAD_DIR;

// Lazy directory creation — runs once, then skips
let dirReady = false;

async function ensureDir() {
  if (dirReady) return;
  await mkdir(uploadDir, { recursive: true });
  dirReady = true;
}

/**
 * Decode a Base64-encoded image and save it to disk.
 *
 * @param {string} base64String - Raw Base64 or data-URI prefixed string.
 * @returns {Promise<string>} Relative path to the saved file, e.g.
 *   "uploads/images/1714470646123_a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"
 * @throws {Error} If the write fails.
 */
export async function saveBase64Image(base64String) {
  await ensureDir();

  // Strip the data-URI prefix if present (e.g. "data:image/jpeg;base64,")
  const commaIndex = base64String.indexOf(',');
  const raw = commaIndex !== -1 ? base64String.slice(commaIndex + 1) : base64String;

  // Decode Base64 → binary Buffer (synchronous C++ binding, <1ms for ~75KB)
  const buffer = Buffer.from(raw, 'base64');

  // Collision-proof filename: timestamp + UUID
  const filename = `${Date.now()}_${randomUUID()}.jpg`;
  const filePath = join(uploadDir, filename);

  // Async disk write — does NOT block the event loop
  await writeFile(filePath, buffer);

  // Return relative path for database storage
  return `${uploadDir}/${filename}`;
}

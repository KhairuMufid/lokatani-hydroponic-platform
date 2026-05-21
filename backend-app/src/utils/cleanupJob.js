/**
 * Automatic Image Cleanup Job
 *
 * Periodically scans the uploads/images/ directory and deletes JPEG files
 * older than 1 hour. Prevents disk exhaustion during high-FPS stress tests
 * (15 FPS × 75KB = ~4GB/hour).
 *
 * Runs every 15 minutes. Tolerant of concurrent file deletions.
 *
 * @module utils/cleanupJob
 */

import { readdir, unlink, stat } from 'node:fs/promises';
import { join } from 'node:path';
import env from '../config/env.js';
import logger from './logger.js';

/** Cleanup interval: every 15 minutes */
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

/** Maximum age before deletion: 1 hour */
const MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Execute a single cleanup pass.
 * Reads the directory, checks file ages, and deletes expired images.
 */
async function runCleanup() {
  try {
    const dir = env.UPLOAD_DIR;
    let files;

    try {
      files = await readdir(dir);
    } catch {
      // Directory doesn't exist yet — nothing to clean
      return;
    }

    const now = Date.now();
    let deleted = 0;

    for (const file of files) {
      // Only target JPEG files
      if (!file.endsWith('.jpg') && !file.endsWith('.jpeg')) continue;

      const filePath = join(dir, file);
      try {
        const fileStat = await stat(filePath);
        if (now - fileStat.mtimeMs > MAX_AGE_MS) {
          await unlink(filePath);
          deleted++;
        }
      } catch {
        // File may have been deleted between readdir and stat — safe to ignore
      }
    }

    if (deleted > 0) {
      logger.info(`[CLEANUP] Deleted ${deleted} expired image(s)`);
    }
  } catch (err) {
    logger.error('[CLEANUP] Unexpected error:', err.message);
  }
}

/**
 * Start the periodic cleanup job.
 * Runs an immediate pass, then schedules recurring execution.
 *
 * @returns {NodeJS.Timeout} Interval handle (can be cleared to stop the job).
 */
export function startCleanupJob() {
  logger.info(
    `[CLEANUP] Started — runs every ${CLEANUP_INTERVAL_MS / 60000} min, ` +
    `deletes images older than ${MAX_AGE_MS / 60000} min`
  );

  // Run immediately on startup
  runCleanup();

  // Schedule recurring cleanup
  return setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}

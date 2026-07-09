/**
 * PostgreSQL Connection Pool Configuration
 *
 * Provides a singleton pg Pool instance and a convenience query() helper.
 * Every server entry point (HTTP, WS, MQTT) imports this module to share
 * the same pool, ensuring efficient connection reuse.
 *
 * Integrates automated Recovery Time measurement for reliability testing:
 *   - Marks POSTGRESQL as DOWN on pool-level errors
 *   - Marks POSTGRESQL as UP when the first successful query executes after an outage
 *
 * @module config/database
 */

import pg from 'pg';
import env from './env.js';
import logger from '../utils/logger.js';
import { markDown, markUp, isDown } from '../utils/recoveryTracker.js';

const { Pool } = pg;
const SERVICE_NAME = 'POSTGRESQL';

const pool = new Pool({
  host:     env.DB_HOST,
  port:     env.DB_PORT,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max:      env.DB_POOL_MAX,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// Log unexpected pool-level errors (e.g. idle client disconnects, broker killed)
pool.on('error', (err) => {
  // Record the exact moment the database became unreachable
  markDown(SERVICE_NAME);
  logger.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized SQL query against the pool.
 *
 *
 * @param {string} text - SQL query string with $1, $2... placeholders.
 * @param {Array}  params - Parameter values.
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  try {
    const result = await pool.query(text, params);

    // If we were in a DB outage and this query succeeded, the DB is back
    if (isDown(SERVICE_NAME)) {
      markUp(SERVICE_NAME);
    }

    return result;
  } catch (err) {
    // Detect connection-level failures that indicate the DB is unreachable
    // These error codes cover: connection refused, terminated, timeout, etc.
    const connectionErrors = [
      'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT',
      'CONNECTION_LOST', 'PROTOCOL_CONNECTION_LOST',
    ];
    const isConnectionError =
      connectionErrors.includes(err.code) ||
      err.message?.includes('Connection terminated') ||
      err.message?.includes('connect ECONNREFUSED') ||
      err.message?.includes('the database system is shutting down') ||
      err.message?.includes('terminating connection') ||
      err.message?.includes('could not connect');

    if (isConnectionError) {
      markDown(SERVICE_NAME);
    }

    throw err; // Re-throw to preserve original error handling in callers
  }
}

export default pool;

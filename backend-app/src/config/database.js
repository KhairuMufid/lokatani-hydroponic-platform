/**
 * PostgreSQL Connection Pool Configuration
 *
 * Provides a singleton pg Pool instance and a convenience query() helper.
 * Every server entry point (HTTP, WS, MQTT) imports this module to share
 * the same pool, ensuring efficient connection reuse.
 *
 * @module config/database
 */

import pg from 'pg';
import env from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

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

// Log unexpected pool-level errors (e.g. idle client disconnects)
pool.on('error', (err) => {
  logger.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized SQL query against the pool.
 * @param {string} text - SQL query string with $1, $2... placeholders.
 * @param {Array}  params - Parameter values.
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  return pool.query(text, params);
}

export default pool;

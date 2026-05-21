/**
 * Structured Console Logger
 *
 * Lightweight logger with level filtering. No external dependencies.
 * Level is controlled via the LOG_LEVEL environment variable.
 *
 * @module utils/logger
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LEVELS.INFO;

/**
 * Format a log prefix with timestamp and level.
 * @param {string} level
 * @returns {string}
 */
function prefix(level) {
  return `[${level.padEnd(5)}] ${new Date().toISOString()}`;
}

const logger = {
  debug: (...args) => {
    if (currentLevel <= LEVELS.DEBUG) console.debug(prefix('DEBUG'), ...args);
  },
  info: (...args) => {
    if (currentLevel <= LEVELS.INFO) console.log(prefix('INFO'), ...args);
  },
  warn: (...args) => {
    if (currentLevel <= LEVELS.WARN) console.warn(prefix('WARN'), ...args);
  },
  error: (...args) => {
    if (currentLevel <= LEVELS.ERROR) console.error(prefix('ERROR'), ...args);
  },
};

export default logger;

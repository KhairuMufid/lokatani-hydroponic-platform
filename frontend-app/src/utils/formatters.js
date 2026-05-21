/**
 * Utility formatters for dates, pest names, and numbers.
 */

/**
 * Format an ISO timestamp to a localized Indonesian date-time string.
 */
export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * Format an ISO timestamp to a short date.
 */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/**
 * Format a relative time string (e.g. "3 menit lalu").
 */
export function timeAgo(iso) {
  if (!iso) return '—';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/**
 * Format a pest name from snake_case to Title Case.
 */
export function formatPestName(name) {
  if (!name) return '—';
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Format a number with limited decimal places.
 */
export function formatNumber(num, decimals = 1) {
  if (num == null) return '—';
  return Number(num).toFixed(decimals);
}

/**
 * Format latency in ms with appropriate unit.
 */
export function formatLatency(ms) {
  if (ms == null) return '—';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms > 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Number(ms).toFixed(1)}ms`;
}

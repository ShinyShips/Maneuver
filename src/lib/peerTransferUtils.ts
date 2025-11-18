/**
 * Utility functions for peer-to-peer data transfer
 */

/**
 * Debug logging helper - only logs in development
 */
const DEBUG = import.meta.env.DEV;
export const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

/**
 * Convert a timestamp to a relative time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time string (e.g., "just now", "5m ago", "2h ago")
 */
export const getRelativeTime = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/**
 * Formats a duration in milliseconds to a clock format (M:SS)
 * @param ms Duration in milliseconds
 * @returns Formatted time string
 */
export function msToClock(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Formats a duration in milliseconds to a human-readable format (e.g., 1h 30m)
 * @param ms Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatTotalDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours === 0) result += `${minutes}m`;
  return result.trim() || '0m';
} 
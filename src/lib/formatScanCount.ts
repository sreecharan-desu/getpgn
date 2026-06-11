/** Compact scan counts for navbar badges (remaining scans in the ring). */
export function formatScanRemaining(remaining: number): string {
  if (remaining > 9999) return `${Math.round(remaining / 1000)}k`;
  if (remaining > 999) return `${(remaining / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return remaining.toLocaleString("en-IN");
}

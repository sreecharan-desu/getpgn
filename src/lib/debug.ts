/** Dev-only structured logs — set DEBUG_GETPGN=true to enable in production builds. */
export function debugLog(
  scope: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  const enabled =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEBUG_GETPGN === 'true' ||
    process.env.DEBUG_GETPGN === 'true';
  if (!enabled) return;
  if (data) {
    console.log(`[GetPGN:${scope}] ${message}`, data);
  } else {
    console.log(`[GetPGN:${scope}] ${message}`);
  }
}

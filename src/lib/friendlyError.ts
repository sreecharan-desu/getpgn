/**
 * Converts any raw error string into a safe, human-readable message.
 *
 * Never let internal details (Prisma/SQL errors, stack traces, network
 * internals, exception class names, etc.) reach the user. Controlled,
 * user-facing messages from the API are passed through; anything that looks
 * technical is replaced with a friendly fallback.
 */
const TECHNICAL_SIGNATURES: RegExp[] = [
  /prisma/i,
  /\bsql\b/i,
  /econnrefused|enotfound|etimedout|econnreset/i,
  /fetch failed|network ?error|failed to fetch/i,
  /cannot read propert|undefined is not|is not a function/i,
  /typeerror|referenceerror|syntaxerror|rangeerror/i,
  /\bat\s+.*:\d+:\d+/, // stack frame
  /unique constraint|foreign key|invalid `?\w+`?\./i,
  /\bnull\b|\bundefined\b/i,
  /<[^>]+>/, // HTML (e.g. an error page returned instead of JSON)
  /\{[\s\S]*"stack"/i,
  /vercel|env var|environment variable|redeploy/i,
  /razorpay_key|rzp_live_|rzp_test_|\.env\b/i,
  /not configured on this deployment/i,
];

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function friendlyError(raw: unknown, fallback: string = GENERIC_ERROR): string {
  if (raw == null) return fallback;
  const msg = (raw instanceof Error ? raw.message : String(raw)).trim();
  if (!msg) return fallback;
  // Overly long messages are almost always raw dumps.
  if (msg.length > 160) return fallback;
  if (TECHNICAL_SIGNATURES.some((re) => re.test(msg))) return fallback;
  return msg;
}

/**
 * Safely parses an API error response into a friendly message.
 */
export async function readApiError(
  res: Response,
  fallback: string = GENERIC_ERROR,
): Promise<string> {
  try {
    const data = await res.json();
    return friendlyError(data?.error, fallback);
  } catch {
    return fallback;
  }
}

import { forceLogout } from '@/lib/clientStorage';

/**
 * If the response indicates the session user was deleted, log out and go home.
 * Returns true when a redirect was triggered.
 */
export async function forceLogoutIfUserNotFound(res: Response): Promise<boolean> {
  if (res.status !== 500 && res.status !== 401) return false;

  try {
    const data = await res.clone().json();
    if (data?.code === 'USER_NOT_FOUND') {
      forceLogout();
      return true;
    }
  } catch {
    /* ignore parse errors */
  }

  return false;
}

/**
 * Parses an API error response, logging out first when the user no longer exists.
 */
export async function readApiErrorOrLogout(
  res: Response,
  fallback: string = GENERIC_ERROR,
): Promise<string | null> {
  if (await forceLogoutIfUserNotFound(res)) return null;
  return readApiError(res, fallback);
}

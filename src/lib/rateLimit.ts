import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/security';

type Bucket = { count: number; resetAt: number };

/** In-memory sliding window — suitable for single-instance deploys. Use Redis for multi-region scale. */
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS * 0.8) break;
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  pruneBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true };
}

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    },
  );
}

/** IP-scoped rate limit helper for API routes. */
export function rateLimitByIp(
  req: NextRequest,
  routeKey: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const ip = getClientIp(req);
  const result = rateLimit(`${routeKey}:${ip}`, limit, windowMs);
  if (!result.ok) return rateLimitResponse(result.retryAfterSec);
  return null;
}

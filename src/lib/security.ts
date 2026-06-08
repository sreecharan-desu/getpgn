import { NextRequest, NextResponse } from 'next/server';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

/** Fail fast when JWT_SECRET is missing or too weak. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET is missing or too short (minimum 32 characters). Set it in your environment.',
    );
  }
  return secret;
}

/**
 * Dev-only routes (billing simulation, test pipeline).
 * Never enabled in production — local NODE_ENV=development only.
 */
export function isDevRouteAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function devRouteBlockedResponse(): NextResponse {
  return NextResponse.json({ error: 'Not found.' }, { status: 404 });
}

/** Generic client-facing API error — logs details server-side only in production. */
export function apiError(
  logLabel: string,
  error: unknown,
  fallback = 'An unexpected error occurred.',
  status = 500,
): NextResponse {
  console.error(`[${logLabel}]`, error);
  const message =
    process.env.NODE_ENV === 'production'
      ? fallback
      : error instanceof Error
        ? error.message
        : fallback;
  return NextResponse.json({ error: message }, { status });
}

export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || 'unknown';
  }
  return 'unknown';
}

export type ImageValidationResult =
  | { ok: true; buffer: Buffer; mimeType: string }
  | { ok: false; response: NextResponse };

function detectImageMime(buffer: Buffer): 'image/jpeg' | 'image/png' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  return null;
}

/** Server-side upload validation — size, declared MIME, and magic bytes. */
export async function validateImageUpload(file: File | null): Promise<ImageValidationResult> {
  if (!file || !(file instanceof File)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No file uploaded.' }, { status: 400 }),
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Empty file uploaded.' }, { status: 400 }),
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 },
      ),
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectImageMime(buffer);

  if (!detected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unsupported file type. Upload a JPG or PNG image.' },
        { status: 415 },
      ),
    };
  }

  const declared = file.type.toLowerCase();
  if (declared && !ALLOWED_IMAGE_MIMES.has(declared)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unsupported file type. Upload a JPG or PNG image.' },
        { status: 415 },
      ),
    };
  }

  return { ok: true, buffer, mimeType: detected };
}

/** Reject cross-site mutations when Origin/Referer do not match the app host. */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  let expected: URL;
  try {
    expected = new URL(appUrl);
  } catch {
    return null;
  }

  const origin = req.headers.get('origin');
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.host !== expected.host) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    return null;
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const r = new URL(referer);
      if (r.host !== expected.host) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
  }

  return null;
}

import { NextRequest, NextResponse } from 'next/server';
import {
  getPasswordResetState,
  issuePasswordResetEmail,
  PASSWORD_RESET_COOLDOWN_SECONDS,
} from '@/lib/passwordResetEmail';
import { rateLimitByIp } from '@/lib/rateLimit';

export const maxDuration = 30;

const GENERIC_SUCCESS = {
  success: true,
  message: 'If an account exists for this email, a reset link has been sent.',
} as const;

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'forgot-password', 8, 15 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const { userId, cooldownSeconds } = await getPasswordResetState(email);

    if (!userId) {
      console.log(`[Forgot Password] Requested email ${email} not found. Returning generic success.`);
      return NextResponse.json({
        ...GENERIC_SUCCESS,
        retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
      });
    }

    if (cooldownSeconds > 0) {
      return NextResponse.json(
        {
          error: `Please wait ${cooldownSeconds} seconds before requesting another reset email.`,
          retryAfterSeconds: cooldownSeconds,
        },
        { status: 429 },
      );
    }

    const sent = await issuePasswordResetEmail(userId, email);
    if (!sent.success) {
      console.error(`[Forgot Password] Email delivery failed for ${email}:`, sent.error);
    }

    return NextResponse.json({
      ...GENERIC_SUCCESS,
      retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[Forgot Password] Error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

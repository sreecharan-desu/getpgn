import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  getPasswordResetCooldown,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  queuePasswordResetEmail,
} from '@/lib/passwordResetEmail';
import { rateLimitByIp } from '@/lib/rateLimit';

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

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true },
    });

    if (!user) {
      console.log(`[Forgot Password] Requested email ${email} not found. Returning generic success.`);
      return NextResponse.json({
        ...GENERIC_SUCCESS,
        retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
      });
    }

    const cooldownSeconds = await getPasswordResetCooldown(user.id);
    if (cooldownSeconds > 0) {
      return NextResponse.json(
        {
          error: `Please wait ${cooldownSeconds} seconds before requesting another reset email.`,
          retryAfterSeconds: cooldownSeconds,
        },
        { status: 429 },
      );
    }

    queuePasswordResetEmail(user.id, email);

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

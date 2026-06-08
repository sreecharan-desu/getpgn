import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { getResendVerificationState } from '@/lib/userVerificationDb';
import {
  issueVerificationEmail,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from '@/lib/emailVerification';
import { getSession } from '@/lib/session';
import { rateLimitByIp } from '@/lib/rateLimit';

const GENERIC_SUCCESS = {
  success: true,
  message: 'If an unverified account exists for this email, a new link has been sent.',
} as const;

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'resend-verification', 8, 15 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const bodyEmail =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    let trimmedEmail = bodyEmail;

    // Skip full session user load when the client already sent an email.
    if (!trimmedEmail) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({
          ...GENERIC_SUCCESS,
          retryAfterSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true, emailVerified: true },
      });

      if (!user?.email || user.emailVerified) {
        return NextResponse.json({
          ...GENERIC_SUCCESS,
          retryAfterSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
        });
      }

      trimmedEmail = user.email.trim().toLowerCase();
    }

    if (!trimmedEmail) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }

    const { userId, emailVerified, cooldownSeconds } =
      await getResendVerificationState(trimmedEmail);

    if (!userId || emailVerified) {
      return NextResponse.json({
        ...GENERIC_SUCCESS,
        retryAfterSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
      });
    }

    if (cooldownSeconds > 0) {
      return NextResponse.json(
        {
          error: `Please wait ${cooldownSeconds} seconds before requesting another email.`,
          retryAfterSeconds: cooldownSeconds,
        },
        { status: 429 },
      );
    }

    // Send after the response so Resend latency never blocks the client.
    after(() => {
      void issueVerificationEmail(userId, trimmedEmail).catch((err) => {
        console.error('[Resend Verification] Background send failed:', err);
      });
    });

    return NextResponse.json({
      ...GENERIC_SUCCESS,
      retryAfterSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[Resend Verification] Error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

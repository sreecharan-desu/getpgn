import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthenticatedUser } from '@/lib/requireAuth';
import {
  queueVerificationEmail,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from '@/lib/emailVerification';
import { apiError, getClientIp } from '@/lib/security';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { getEmailDomain, isDisposableEmail } from '@/lib/disposableEmail';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = rateLimit(`change-email:${ip}`, 6, 60 * 60_000);
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterSec);

  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const user = auth.user;
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Verified accounts cannot change email here.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!rawEmail || rawEmail.length > 254) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const normalizedEmail = rawEmail.toLowerCase();

    if (user.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json({ error: 'That is already your email address.' }, { status: 400 });
    }

    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please use a permanent email address.' },
        { status: 400 },
      );
    }

    const emailDomain = getEmailDomain(normalizedEmail);
    if (emailDomain) {
      const domainLimit = rateLimit(`signup:domain:${emailDomain}`, 3, 24 * 60 * 60_000);
      if (!domainLimit.ok) return rateLimitResponse(domainLimit.retryAfterSec);
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingEmail && existingEmail.id !== user.id) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: normalizedEmail,
        emailVerified: false,
      },
    });

    queueVerificationEmail(user.id, normalizedEmail);

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message: 'Email updated. Check your inbox for a new verification link.',
      retryAfterSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    return apiError('Change email', error, 'Could not update your email.');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { queueVerificationEmail } from '@/lib/emailVerification';
import { createSession } from '@/lib/session';
import { apiError, getClientIp } from '@/lib/security';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { getEmailDomain, isDisposableEmail } from '@/lib/disposableEmail';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = rateLimit(`signup:ip:${ip}`, 5, 60 * 60_000);
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterSec);

  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required.' }, { status: 400 });
    }

    if (username.length > 32 || email.length > 254) {
      return NextResponse.json({ error: 'Username or email is too long.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    if (username.length < 3 || password.length < 8) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and password at least 8 characters.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isDisposableEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Please use a permanent email address to sign up.' },
        { status: 400 },
      );
    }

    const emailDomain = getEmailDomain(normalizedEmail);
    if (emailDomain) {
      const domainLimit = rateLimit(`signup:domain:${emailDomain}`, 3, 24 * 60 * 60_000);
      if (!domainLimit.ok) return rateLimitResponse(domainLimit.retryAfterSec);
    }

    const [existingUsername, existingEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    ]);

    if (existingUsername) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    if (existingEmail) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email: normalizedEmail,
        passwordHash,
        plan: 'FREE',
        emailVerified: false,
      },
      select: { id: true, username: true },
    });

    queueVerificationEmail(user.id, normalizedEmail);
    await createSession(user.id, user.username);

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      message: 'Account created. Please verify your email to continue.',
    });
  } catch (error) {
    return apiError('Signup', error, 'Could not create account.');
  }
}

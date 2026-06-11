import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session';
import { apiError, getClientIp } from '@/lib/security';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = rateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterSec);

  try {
    const { username, password } = await req.json();
    const identifier = String(username ?? '').trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username or email and password are required.' },
        { status: 400 },
      );
    }

    const rateKey = identifier.toLowerCase();
    const userLimit = rateLimit(`login:user:${rateKey}`, 10, 15 * 60_000);
    if (!userLimit.ok) return rateLimitResponse(userLimit.retryAfterSec);

    const isEmail = identifier.includes('@');
    const user = isEmail
      ? await prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
          select: {
            id: true,
            username: true,
            email: true,
            passwordHash: true,
            plan: true,
            emailVerified: true,
            onboardingCompleted: true,
          },
        })
      : await prisma.user.findUnique({
          where: { username: identifier },
          select: {
            id: true,
            username: true,
            email: true,
            passwordHash: true,
            plan: true,
            emailVerified: true,
            onboardingCompleted: true,
          },
        });

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    await createSession(user.id, user.username);

    if (!user.email) {
      return NextResponse.json({
        success: true,
        needsEmail: true,
        username: user.username,
        message: 'Add your email to continue.',
      });
    }

    if (!user.emailVerified) {
      return NextResponse.json({
        success: true,
        needsVerification: true,
        email: user.email,
        message: 'Please verify your email to continue.',
      });
    }

    if (!user.onboardingCompleted) {
      return NextResponse.json({
        success: true,
        needsOnboarding: true,
        message: 'Complete onboarding to continue.',
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        plan: user.plan,
      },
    });
  } catch (error) {
    return apiError('Login', error, 'Could not sign in.');
  }
}

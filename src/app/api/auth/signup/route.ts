import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { attachReferralAtSignup, generateUniqueReferralCode } from '@/lib/referrals';
import { notifyReferrerFriendSignedUp } from '@/lib/notificationEmail';
import { createSession } from '@/lib/session';
import { apiError, getClientIp } from '@/lib/security';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { USERNAME_PATTERN } from '@/lib/signupFlow';
import bcrypt from 'bcryptjs';
import { defaultAvatarPiece } from '@/lib/chessAvatars';

/** Step 1–2: create account with username + password (email added later). */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = rateLimit(`signup:ip:${ip}`, 5, 60 * 60_000);
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterSec);

  try {
    const { username: rawUsername, password, referralCode } = await req.json();
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 },
      );
    }

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–32 characters (letters, numbers, _ or -).' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newReferralCode = await generateUniqueReferralCode();

    const user = await prisma.user.create({
      data: {
        username,
        email: null,
        passwordHash,
        plan: 'FREE',
        emailVerified: false,
        referralCode: newReferralCode,
        avatarPiece: defaultAvatarPiece(username),
      },
      select: { id: true, username: true },
    });

    if (typeof referralCode === 'string' && referralCode.trim()) {
      const referral = await attachReferralAtSignup(user.id, referralCode).catch((err) => {
        console.warn('[Signup] Referral attach failed:', err);
        return { attached: false as const };
      });
      if (referral?.attached && referral.referrerId && referral.refereeUsername) {
        notifyReferrerFriendSignedUp(referral.referrerId, referral.refereeUsername);
      }
    }

    await createSession(user.id, user.username);

    return NextResponse.json({
      success: true,
      username: user.username,
      message: 'Account created. Add your email to continue.',
    });
  } catch (error) {
    return apiError('Signup', error, 'Could not create account.');
  }
}

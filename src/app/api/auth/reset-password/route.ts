import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 1. Find token in DB
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: {
        id: true,
        userId: true,
        used: true,
        expiresAt: true,
        user: { select: { username: true } },
      },
    });

    // 2. Validate token (exists, not used, not expired)
    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired password reset link.' }, { status: 400 });
    }

    if (resetToken.used) {
      return NextResponse.json({ error: 'This password reset link has already been used.' }, { status: 400 });
    }

    const now = new Date();
    if (now > resetToken.expiresAt) {
      return NextResponse.json({ error: 'This password reset link has expired.' }, { status: 400 });
    }

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Update the user password and mark the token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      }),
      // 5. Clean up old unused/expired/used reset tokens for this user
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          OR: [
            { used: true },
            { expiresAt: { lt: now } }
          ]
        }
      })
    ]);

    console.log(`[Reset Password] Successfully updated password for user ${resetToken.user.username}.`);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.'
    });

  } catch (error) {
    const err = error as Error;
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/session';
import { consumeVerificationToken, findVerificationToken } from '@/lib/userVerificationDb';
import { queueWelcomeEmail } from '@/lib/welcomeEmail';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const verificationToken = await findVerificationToken(token);

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link.' },
        { status: 400 },
      );
    }

    if (verificationToken.used) {
      return NextResponse.json(
        { error: 'This verification link has already been used.' },
        { status: 400 },
      );
    }

    if (new Date() > verificationToken.expiresAt) {
      return NextResponse.json(
        { error: 'This verification link has expired. Request a new one.' },
        { status: 400 },
      );
    }

    if (verificationToken.emailVerified) {
      await createSession(verificationToken.userId, verificationToken.username);
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    await consumeVerificationToken(verificationToken.id, verificationToken.userId);
    await createSession(verificationToken.userId, verificationToken.username);

    if (verificationToken.email) {
      queueWelcomeEmail(verificationToken.email, verificationToken.username);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error('[Verify Email] Error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

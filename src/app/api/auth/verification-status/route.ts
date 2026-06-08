import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getVerificationResendCooldown } from '@/lib/userVerificationDb';
import { VERIFICATION_RESEND_COOLDOWN_SECONDS } from '@/lib/emailVerification';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ verified: true });
  }

  const cooldownSeconds = await getVerificationResendCooldown(user.id);

  return NextResponse.json({
    verified: false,
    email: user.email,
    cooldownSeconds,
    cooldownTotalSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
  });
}

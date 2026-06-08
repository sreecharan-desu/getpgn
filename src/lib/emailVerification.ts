import crypto from 'crypto';
import { after } from 'next/server';
import { sendVerificationEmail } from '@/lib/email';
import {
  hasRecentVerificationToken,
  insertVerificationToken,
  markEmailUnverified,
} from '@/lib/userVerificationDb';

export const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000;
export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

export async function issueVerificationEmail(
  userId: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await insertVerificationToken(userId, token, expiresAt);

  const emailResult = await sendVerificationEmail(email, token);
  return { success: emailResult.success, error: emailResult.error };
}

/** Schedule verification email after the HTTP response — keeps API latency low on Vercel. */
export function queueVerificationEmail(userId: string, email: string): void {
  after(() => {
    void issueVerificationEmail(userId, email).catch((err) => {
      console.error('[Email Verification] Background send failed:', err);
    });
  });
}

export { hasRecentVerificationToken, markEmailUnverified };

import crypto from 'crypto';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

export async function getPasswordResetCooldown(userId: string): Promise<number> {
  const since = new Date(Date.now() - PASSWORD_RESET_COOLDOWN_SECONDS * 1000);
  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!recent) return 0;
  const elapsed = Date.now() - recent.createdAt.getTime();
  return Math.max(
    0,
    Math.ceil((PASSWORD_RESET_COOLDOWN_SECONDS * 1000 - elapsed) / 1000),
  );
}

export async function issuePasswordResetEmail(
  userId: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt,
      used: false,
    },
  });

  const emailResult = await sendPasswordResetEmail(email, token);
  return { success: emailResult.success, error: emailResult.error };
}

/** Schedule reset email after the HTTP response — same pattern as verification emails. */
export function queuePasswordResetEmail(userId: string, email: string): void {
  after(() => {
    void issuePasswordResetEmail(userId, email).catch((err) => {
      console.error('[Password Reset] Background send failed:', err);
    });
  });
}

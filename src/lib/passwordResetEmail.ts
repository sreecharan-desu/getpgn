import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

const PASSWORD_RESET_COOLDOWN_MS = PASSWORD_RESET_COOLDOWN_SECONDS * 1000;

function cooldownFromTokenAt(tokenAt: Date | null | undefined): number {
  if (!tokenAt) return 0;
  const elapsed = Date.now() - new Date(tokenAt).getTime();
  return Math.max(0, Math.ceil((PASSWORD_RESET_COOLDOWN_MS - elapsed) / 1000));
}

export type PasswordResetState = {
  userId: string | null;
  cooldownSeconds: number;
};

/** Single round-trip: user lookup + resend cooldown for an email address. */
export async function getPasswordResetState(email: string): Promise<PasswordResetState> {
  try {
    const since = new Date(Date.now() - PASSWORD_RESET_COOLDOWN_MS);
    const rows = await prisma.$queryRaw<
      { id: string; last_token_at: Date | null }[]
    >`
      SELECT
        u.id,
        (
          SELECT prt.created_at
          FROM password_reset_tokens prt
          WHERE prt.user_id = u.id
            AND prt.created_at >= ${since}
          ORDER BY prt.created_at DESC
          LIMIT 1
        ) AS last_token_at
      FROM "User" u
      WHERE u.email = ${email}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return { userId: null, cooldownSeconds: 0 };
    }

    return {
      userId: row.id,
      cooldownSeconds: cooldownFromTokenAt(row.last_token_at),
    };
  } catch {
    return { userId: null, cooldownSeconds: 0 };
  }
}

export async function issuePasswordResetEmail(
  userId: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  const [emailResult] = await Promise.all([
    sendPasswordResetEmail(email, token),
    prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
        used: false,
      },
    }),
  ]);

  if (!emailResult.success) {
    console.error(`[Password Reset] Resend failed for ${email}:`, emailResult.error);
  }
  return { success: emailResult.success, error: emailResult.error };
}

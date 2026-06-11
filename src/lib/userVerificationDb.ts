import { prisma } from '@/lib/db';

/** Read email_verified via SQL — works even if Prisma Client was generated before the column existed. */
export async function readEmailVerified(userId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ email_verified: boolean }[]>`
      SELECT email_verified FROM "User" WHERE id = ${userId} LIMIT 1
    `;
    return rows[0]?.email_verified ?? true;
  } catch {
    return true;
  }
}

export async function markEmailUnverified(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User" SET email_verified = false WHERE id = ${userId}
  `;
}

export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User" SET email_verified = true WHERE id = ${userId}
  `;
}

export async function insertVerificationToken(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.emailVerificationToken.create({
    data: { userId, token, expiresAt },
  });
}

const RESEND_COOLDOWN_MS = 60 * 1000;

function cooldownFromTokenAt(tokenAt: Date | null | undefined): number {
  if (!tokenAt) return 0;
  const elapsed = Date.now() - new Date(tokenAt).getTime();
  return Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000));
}

export type ResendVerificationState = {
  userId: string | null;
  emailVerified: boolean;
  cooldownSeconds: number;
};

/** Single round-trip: user lookup + resend cooldown for an email address. */
export async function getResendVerificationState(
  email: string,
): Promise<ResendVerificationState> {
  try {
    const since = new Date(Date.now() - RESEND_COOLDOWN_MS);
    const rows = await prisma.$queryRaw<
      { id: string; email_verified: boolean; last_token_at: Date | null }[]
    >`
      SELECT
        u.id,
        u.email_verified,
        (
          SELECT evt.created_at
          FROM email_verification_tokens evt
          WHERE evt.user_id = u.id
            AND evt.created_at >= ${since}
          ORDER BY evt.created_at DESC
          LIMIT 1
        ) AS last_token_at
      FROM "User" u
      WHERE u.email = ${email}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return { userId: null, emailVerified: true, cooldownSeconds: 0 };
    }

    return {
      userId: row.id,
      emailVerified: row.email_verified,
      cooldownSeconds: cooldownFromTokenAt(row.last_token_at),
    };
  } catch {
    return { userId: null, emailVerified: true, cooldownSeconds: 0 };
  }
}

export async function hasRecentVerificationToken(userId: string): Promise<boolean> {
  return (await getVerificationResendCooldown(userId)) > 0;
}

/** Seconds until another verification email can be sent (0 = allowed). */
export async function getVerificationResendCooldown(userId: string): Promise<number> {
  try {
    const since = new Date(Date.now() - RESEND_COOLDOWN_MS);
    const rows = await prisma.$queryRaw<{ created_at: Date }[]>`
      SELECT created_at
      FROM email_verification_tokens
      WHERE user_id = ${userId}
        AND created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return cooldownFromTokenAt(rows[0]?.created_at);
  } catch {
    return 0;
  }
}

export type VerificationTokenRow = {
  id: string;
  userId: string;
  used: boolean;
  expiresAt: Date;
  username: string;
  email: string | null;
  emailVerified: boolean;
};

export async function findVerificationToken(token: string): Promise<VerificationTokenRow | null> {
  try {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        user_id: string;
        used: boolean;
        expires_at: Date;
        username: string;
        email: string | null;
        email_verified: boolean;
      }[]
    >`
      SELECT
        evt.id,
        evt.user_id,
        evt.used,
        evt.expires_at,
        u.username,
        u.email,
        u.email_verified
      FROM email_verification_tokens evt
      INNER JOIN "User" u ON u.id = evt.user_id
      WHERE evt.token = ${token}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      used: row.used,
      expiresAt: row.expires_at,
      username: row.username,
      email: row.email,
      emailVerified: row.email_verified,
    };
  } catch {
    return null;
  }
}

export async function consumeVerificationToken(tokenId: string, userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User" SET email_verified = true WHERE id = ${userId}
  `;
  await prisma.$executeRaw`
    UPDATE email_verification_tokens SET used = true WHERE id = ${tokenId}
  `;
}

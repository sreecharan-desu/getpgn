import crypto from 'crypto';
import { prisma } from '@/lib/db';

export const REFERRAL_REWARD_SCANS = 2;

/** Generate a unique 8-char referral code (uppercase alphanumeric). */
export async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i]! % chars.length];
    }
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Could not generate unique referral code.');
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (user?.referralCode) return user.referralCode;

  const code = await generateUniqueReferralCode();
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
  });
  return code;
}

/** Attach a pending referral at signup. Returns referrer info when linked. */
export async function attachReferralAtSignup(
  refereeId: string,
  referralCodeInput: string | undefined | null,
): Promise<{ attached: boolean; referrerId?: string; refereeUsername?: string }> {
  const code = referralCodeInput?.trim().toUpperCase();
  if (!code || code.length < 4) return { attached: false };

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, referralCode: true },
  });
  if (!referrer || referrer.id === refereeId) return { attached: false };

  const referee = await prisma.user.findUnique({
    where: { id: refereeId },
    select: { referredById: true, username: true },
  });
  if (referee?.referredById) return { attached: false };

  const existing = await prisma.referral.findUnique({
    where: { refereeId },
    select: { id: true },
  });
  if (existing) return { attached: false };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: refereeId },
      data: { referredById: referrer.id },
    }),
    prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId,
        status: 'pending',
      },
    }),
  ]);

  return {
    attached: true,
    referrerId: referrer.id,
    refereeUsername: referee!.username,
  };
}

export type ReferralCompletionResult = {
  completed: boolean;
  referrerUsername?: string;
  rewardScans?: number;
};

/**
 * Complete referral after referee's first successful scan.
 * Grants +2 bonus scans to both parties once.
 */
export async function completeReferralOnFirstScan(
  refereeId: string,
): Promise<ReferralCompletionResult> {
  const referral = await prisma.referral.findUnique({
    where: { refereeId },
    include: {
      referrer: { select: { id: true, username: true, emailVerified: true } },
      referee: { select: { id: true, emailVerified: true } },
    },
  });

  if (!referral || referral.status === 'completed') {
    return { completed: false };
  }
  if (!referral.referee.emailVerified) {
    return { completed: false };
  }

  let completed = false;

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.referral.findUnique({ where: { refereeId } });
    if (!fresh || fresh.status === 'completed') return;

    if (!fresh.referrerRewarded) {
      await tx.user.update({
        where: { id: referral.referrerId },
        data: { bonusScanCount: { increment: REFERRAL_REWARD_SCANS } },
      });
    }

    if (!fresh.refereeRewarded) {
      await tx.user.update({
        where: { id: refereeId },
        data: { bonusScanCount: { increment: REFERRAL_REWARD_SCANS } },
      });
    }

    await tx.referral.update({
      where: { id: referral.id },
      data: {
        status: 'completed',
        referrerRewarded: true,
        refereeRewarded: true,
        completedAt: new Date(),
      },
    });

    completed = true;
  });

  if (!completed) {
    return { completed: false };
  }

  return {
    completed: true,
    referrerUsername: referral.referrer.username,
    rewardScans: REFERRAL_REWARD_SCANS,
  };
}

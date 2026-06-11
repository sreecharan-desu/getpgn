import { prisma } from '@/lib/db';
import { REFERRAL_REWARD_SCANS } from '@/lib/referrals';

export type ReferralBonusNotice = {
  referrerUsername: string;
  rewardScans: number;
};

/** Pending in-app notice for a referee who earned referral bonus scans. */
export async function getReferralBonusNotice(
  userId: string,
): Promise<ReferralBonusNotice | null> {
  const referral = await prisma.referral.findUnique({
    where: { refereeId: userId },
    select: {
      status: true,
      refereeRewarded: true,
      refereeBonusAcknowledgedAt: true,
      referrer: { select: { username: true } },
    },
  });

  if (
    !referral ||
    referral.status !== 'completed' ||
    !referral.refereeRewarded ||
    referral.refereeBonusAcknowledgedAt
  ) {
    return null;
  }

  return {
    referrerUsername: referral.referrer.username,
    rewardScans: REFERRAL_REWARD_SCANS,
  };
}

export async function acknowledgeReferralBonusNotice(userId: string): Promise<boolean> {
  const result = await prisma.referral.updateMany({
    where: {
      refereeId: userId,
      status: 'completed',
      refereeRewarded: true,
      refereeBonusAcknowledgedAt: null,
    },
    data: { refereeBonusAcknowledgedAt: new Date() },
  });
  return result.count > 0;
}

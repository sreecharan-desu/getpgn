import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';

export const FREE_SCAN_LIMIT = 2;
export const PRO_MONTHLY_PLAN_SCAN_LIMIT = 100;
export const PRO_YEARLY_PLAN_SCAN_LIMIT = 1000;

export type ScanTier = 'free' | 'pro';

export interface ScanUsageUser {
  plan: 'FREE' | 'PAID';
  scanCount: number;
  monthlyScanCount: number;
  monthlyScanMonth: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEnd?: Date | string | null;
  subscriptionExpiresAt?: Date | string | null;
}

export interface ScanUsage {
  tier: ScanTier;
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  monthKey: string | null;
  planLabel: string;
}

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getProScanLimit(subscriptionPlan: string | null | undefined): number {
  return subscriptionPlan === 'yearly'
    ? PRO_YEARLY_PLAN_SCAN_LIMIT
    : PRO_MONTHLY_PLAN_SCAN_LIMIT;
}

export function formatProScanAllowance(subscriptionPlan: string | null | undefined): string {
  const limit = getProScanLimit(subscriptionPlan);
  return `${limit.toLocaleString()} scans/month`;
}

export function getScanUsage(user: ScanUsageUser, now = new Date()): ScanUsage {
  if (isProUser(user)) {
    const monthKey = getCurrentMonthKey(now);
    const limit = getProScanLimit(user.subscriptionPlan);
    const used =
      user.monthlyScanMonth === monthKey ? Math.max(0, user.monthlyScanCount) : 0;
    const remaining = Math.max(0, limit - used);

    return {
      tier: 'pro',
      used,
      limit,
      remaining,
      exhausted: used >= limit,
      monthKey,
      planLabel:
        user.subscriptionPlan === 'yearly' ? 'Pro yearly' : 'Pro monthly',
    };
  }

  const used = Math.max(0, user.scanCount);
  const limit = FREE_SCAN_LIMIT;
  const remaining = Math.max(0, limit - used);

  return {
    tier: 'free',
    used,
    limit,
    remaining,
    exhausted: used >= limit,
    monthKey: null,
    planLabel: 'Free',
  };
}

export async function reserveFreeScan(userId: string): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { id: userId, plan: 'FREE', scanCount: { lt: FREE_SCAN_LIMIT } },
    data: { scanCount: { increment: 1 } },
  });
  return result.count === 1;
}

export async function rollbackFreeScan(userId: string): Promise<void> {
  await prisma.user
    .updateMany({
      where: { id: userId, scanCount: { gt: 0 } },
      data: { scanCount: { decrement: 1 } },
    })
    .catch((err) => console.error('[Scan Limits] Free scan rollback failed:', err));
}

export async function reserveProScan(
  userId: string,
  subscriptionPlan: string | null | undefined,
  monthKey = getCurrentMonthKey(),
): Promise<boolean> {
  const limit = getProScanLimit(subscriptionPlan);

  const sameMonth = await prisma.user.updateMany({
    where: {
      id: userId,
      monthlyScanMonth: monthKey,
      monthlyScanCount: { lt: limit },
    },
    data: { monthlyScanCount: { increment: 1 } },
  });
  if (sameMonth.count === 1) return true;

  const newMonth = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ monthlyScanMonth: null }, { monthlyScanMonth: { not: monthKey } }],
    },
    data: { monthlyScanCount: 1, monthlyScanMonth: monthKey },
  });
  return newMonth.count === 1;
}

export async function rollbackProScan(
  userId: string,
  monthKey = getCurrentMonthKey(),
): Promise<void> {
  await prisma.user
    .updateMany({
      where: { id: userId, monthlyScanMonth: monthKey, monthlyScanCount: { gt: 0 } },
      data: { monthlyScanCount: { decrement: 1 } },
    })
    .catch((err) => console.error('[Scan Limits] Pro scan rollback failed:', err));
}

export function getScanLimitErrorMessage(usage: ScanUsage): string {
  if (usage.tier === 'free') {
    return 'Scan limit exceeded. You have already used your 2 free scans. Please upgrade to a Paid plan to unlock more scans.';
  }

  return `Monthly scan limit reached (${usage.limit.toLocaleString()} scans on your ${usage.planLabel.toLowerCase()} plan). Your quota resets at the start of next month.`;
}

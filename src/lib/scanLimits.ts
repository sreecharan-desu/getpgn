import { prisma } from '@/lib/db';
import { isProUser, type ProAccessUser } from '@/lib/proAccess';

export const FREE_SCAN_LIMIT = 2;
export const PRO_MONTHLY_PLAN_SCAN_LIMIT = 100;
export const PRO_YEARLY_PLAN_SCAN_LIMIT = 1000;

export type ScanTier = 'free' | 'pro';
export type ScanPeriodUnit = 'month' | 'year';

export interface ScanUsageUser extends ProAccessUser {
  scanCount: number;
  monthlyScanCount: number;
  monthlyScanMonth: string | null;
  subscriptionPlan?: string | null;
}

export interface ScanUsage {
  tier: ScanTier;
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  periodKey: string | null;
  periodUnit: ScanPeriodUnit | null;
  planLabel: string;
}

export function isYearlyPlan(subscriptionPlan: string | null | undefined): boolean {
  return subscriptionPlan === 'yearly';
}

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getCurrentYearKey(date = new Date()): string {
  return String(date.getUTCFullYear());
}

/** Billing period key stored in `monthlyScanMonth` (YYYY-MM or YYYY). */
export function getScanPeriodKey(
  subscriptionPlan: string | null | undefined,
  date = new Date(),
): string {
  return isYearlyPlan(subscriptionPlan) ? getCurrentYearKey(date) : getCurrentMonthKey(date);
}

export function getScanPeriodUnit(
  subscriptionPlan: string | null | undefined,
): ScanPeriodUnit | null {
  if (!subscriptionPlan) return null;
  return isYearlyPlan(subscriptionPlan) ? 'year' : 'month';
}

export function getProScanLimit(subscriptionPlan: string | null | undefined): number {
  return isYearlyPlan(subscriptionPlan)
    ? PRO_YEARLY_PLAN_SCAN_LIMIT
    : PRO_MONTHLY_PLAN_SCAN_LIMIT;
}

export function formatProScanAllowance(subscriptionPlan: string | null | undefined): string {
  if (isYearlyPlan(subscriptionPlan)) {
    return `${PRO_YEARLY_PLAN_SCAN_LIMIT.toLocaleString()} scans/year`;
  }
  return `${PRO_MONTHLY_PLAN_SCAN_LIMIT} scans/month`;
}

export function getScanUsage(user: ScanUsageUser, now = new Date()): ScanUsage {
  if (isProUser(user)) {
    const periodKey = getScanPeriodKey(user.subscriptionPlan, now);
    const periodUnit = getScanPeriodUnit(user.subscriptionPlan);
    const limit = getProScanLimit(user.subscriptionPlan);
    const used =
      user.monthlyScanMonth === periodKey ? Math.max(0, user.monthlyScanCount) : 0;
    const remaining = Math.max(0, limit - used);

    return {
      tier: 'pro',
      used,
      limit,
      remaining,
      exhausted: used >= limit,
      periodKey,
      periodUnit,
      planLabel: isYearlyPlan(user.subscriptionPlan) ? 'Pro yearly' : 'Pro monthly',
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
    periodKey: null,
    periodUnit: null,
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
  periodKey = getScanPeriodKey(subscriptionPlan),
): Promise<boolean> {
  const limit = getProScanLimit(subscriptionPlan);

  const samePeriod = await prisma.user.updateMany({
    where: {
      id: userId,
      monthlyScanMonth: periodKey,
      monthlyScanCount: { lt: limit },
    },
    data: { monthlyScanCount: { increment: 1 } },
  });
  if (samePeriod.count === 1) return true;

  const newPeriod = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ monthlyScanMonth: null }, { monthlyScanMonth: { not: periodKey } }],
    },
    data: { monthlyScanCount: 1, monthlyScanMonth: periodKey },
  });
  return newPeriod.count === 1;
}

export async function rollbackProScan(
  userId: string,
  subscriptionPlan: string | null | undefined,
  periodKey = getScanPeriodKey(subscriptionPlan),
): Promise<void> {
  await prisma.user
    .updateMany({
      where: { id: userId, monthlyScanMonth: periodKey, monthlyScanCount: { gt: 0 } },
      data: { monthlyScanCount: { decrement: 1 } },
    })
    .catch((err) => console.error('[Scan Limits] Pro scan rollback failed:', err));
}

export function getScanLimitErrorMessage(usage: ScanUsage): string {
  if (usage.tier === 'free') {
    return 'Scan limit exceeded. You have already used your 2 free scans. Please upgrade to a Paid plan to unlock more scans.';
  }

  if (usage.periodUnit === 'year') {
    return `Yearly scan limit reached (${usage.limit.toLocaleString()} scans on your Pro yearly plan). Your quota resets on January 1.`;
  }

  return `Monthly scan limit reached (${usage.limit.toLocaleString()} scans on your Pro monthly plan). Your quota resets at the start of next month.`;
}

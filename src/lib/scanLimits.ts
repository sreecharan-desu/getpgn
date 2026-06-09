import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isProUser, type ProAccessUser } from '@/lib/proAccess';

export const FREE_SCAN_LIMIT = 2;
export const PRO_MONTHLY_PLAN_SCAN_LIMIT = 100;
export const PRO_YEARLY_PLAN_SCAN_LIMIT = 1000;

/**
 * Scan quota model (two separate counters):
 *
 * - `scanCount` — FREE plan only: lifetime scans **consumed** (0–2), not remaining.
 *   Ignored once the user is on Pro. Kept after upgrade so downgrade cannot bypass
 *   the free lifetime cap.
 *
 * - `monthlyScanCount` + `monthlyScanMonth` — PRO plan only: scans **consumed** in the
 *   current billing period (YYYY-MM for monthly, YYYY for yearly). Limit comes from
 *   `getProScanLimit()` (100/month or 1,000/year), not from `scanCount`.
 */

export type ScanTier = 'free' | 'pro';
export type ScanPeriodUnit = 'month' | 'year';

export interface ScanUsageUser extends ProAccessUser {
  id: string;
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

/** Free-tier scans consumed (0–FREE_SCAN_LIMIT). Not used for Pro quota. */
export function getFreeScansUsed(user: Pick<ScanUsageUser, 'scanCount'>): number {
  return Math.max(0, user.scanCount);
}

/**
 * Seed Pro billing-period scan fields on first activation only.
 * Does not reset `scanCount` (free lifetime usage is preserved for downgrade).
 */
export function buildProActivationScanFields(
  subscriptionPlan: string | null | undefined,
  existingPeriodKey: string | null | undefined,
  now = new Date(),
): { monthlyScanCount: number; monthlyScanMonth: string } | Record<string, never> {
  if (existingPeriodKey) return {};
  const periodKey = getScanPeriodKey(subscriptionPlan, now);
  return { monthlyScanCount: 0, monthlyScanMonth: periodKey };
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

  const used = getFreeScansUsed(user);
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
      plan: 'PAID',
      monthlyScanMonth: periodKey,
      monthlyScanCount: { lt: limit },
    },
    data: { monthlyScanCount: { increment: 1 } },
  });
  if (samePeriod.count === 1) return true;

  const newPeriod = await prisma.user.updateMany({
    where: {
      id: userId,
      plan: 'PAID',
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
      where: {
        id: userId,
        plan: 'PAID',
        monthlyScanMonth: periodKey,
        monthlyScanCount: { gt: 0 },
      },
      data: { monthlyScanCount: { decrement: 1 } },
    })
    .catch((err) => console.error('[Scan Limits] Pro scan rollback failed:', err));
}

export interface ScanReservation {
  userId: string;
  isPro: boolean;
  periodKey: string | null;
  plan: string | null | undefined;
}

/** Reserve one scan for a verified user, or return a 403 response payload. */
export async function reserveScanForUser(
  user: ScanUsageUser,
): Promise<{ ok: true; reservation: ScanReservation } | { ok: false; response: NextResponse }> {
  const usage = getScanUsage(user);
  if (usage.exhausted) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: getScanLimitErrorMessage(usage), limitExceeded: true },
        { status: 403 },
      ),
    };
  }

  const isPro = isProUser(user);
  if (isPro) {
    const periodKey = getScanPeriodKey(user.subscriptionPlan);
    const reserved = await reserveProScan(user.id, user.subscriptionPlan, periodKey);
    if (!reserved) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: getScanLimitErrorMessage(getScanUsage(user)), limitExceeded: true },
          { status: 403 },
        ),
      };
    }
    return {
      ok: true,
      reservation: {
        userId: user.id,
        isPro: true,
        periodKey,
        plan: user.subscriptionPlan,
      },
    };
  }

  const reserved = await reserveFreeScan(user.id);
  if (!reserved) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: getScanLimitErrorMessage(getScanUsage(user)), limitExceeded: true },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    reservation: { userId: user.id, isPro: false, periodKey: null, plan: null },
  };
}

export async function rollbackScanReservation(reservation: ScanReservation): Promise<void> {
  if (reservation.isPro) {
    await rollbackProScan(
      reservation.userId,
      reservation.plan,
      reservation.periodKey ?? getScanPeriodKey(reservation.plan),
    );
  } else {
    await rollbackFreeScan(reservation.userId);
  }
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCatalogPlan, getPlanCatalog, isEnterprisePlan } from '@/lib/planCatalog';
import { isProUser, type ProAccessUser } from '@/lib/proAccess';
import {
  getOrganizerAccount,
  reserveOrganizerWalletScan,
  rollbackOrganizerWalletScan,
  type OrganizerAccountSnapshot,
} from '@/lib/organizerWallet';

export const FREE_SCAN_LIMIT = 2;

/** @deprecated Use getPlanCatalog() — kept for backward-compatible imports. */
export const PRO_MONTHLY_PLAN_SCAN_LIMIT = getPlanCatalog().monthly.scanLimit;
/** @deprecated Use getPlanCatalog() — kept for backward-compatible imports. */
export const PRO_YEARLY_PLAN_SCAN_LIMIT = getPlanCatalog().yearly.scanLimit;

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

export type ScanTier = 'free' | 'pro' | 'organizer';
export type ScanPeriodUnit = 'month' | 'year';

export interface ScanUsageUser extends ProAccessUser {
  id: string;
  scanCount: number;
  monthlyScanCount: number;
  monthlyScanMonth: string | null;
  bonusScanCount?: number;
  subscriptionPlan?: string | null;
}

export interface ScanCreditPool {
  used: number;
  limit: number;
  remaining: number;
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
  /** Populated when multiple pools (free + prepaid, pro + prepaid) are shown together. */
  breakdown?: {
    free?: ScanCreditPool;
    pro?: ScanCreditPool;
    wallet?: ScanCreditPool;
  };
}

export function isYearlyPlan(subscriptionPlan: string | null | undefined): boolean {
  return subscriptionPlan === 'yearly' || subscriptionPlan === 'enterprise';
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
  if (subscriptionPlan === 'enterprise') {
    return getCatalogPlan('enterprise').scanLimit;
  }
  if (subscriptionPlan === 'yearly') {
    return getCatalogPlan('yearly').scanLimit;
  }
  return getCatalogPlan('monthly').scanLimit;
}

export function getBonusScans(user: Pick<ScanUsageUser, 'bonusScanCount'>): number {
  return Math.max(0, user.bonusScanCount ?? 0);
}

export function formatProScanAllowance(subscriptionPlan: string | null | undefined): string {
  if (subscriptionPlan === 'enterprise') {
    const limit = getCatalogPlan('enterprise').scanLimit;
    return `${limit.toLocaleString()} scans/year`;
  }
  if (isYearlyPlan(subscriptionPlan)) {
    return `${getCatalogPlan('yearly').scanLimit.toLocaleString()} scans/year`;
  }
  return `${getCatalogPlan('monthly').scanLimit} scans/month`;
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

export function getWalletScanUsage(organizerAccount: OrganizerAccountSnapshot): ScanUsage {
  const used = Math.max(0, organizerAccount.totalScansUsed);
  const limit = organizerAccount.totalScansPurchased;
  const remaining = Math.max(0, organizerAccount.availableScans);

  return {
    tier: 'organizer',
    used,
    limit,
    remaining,
    exhausted: remaining <= 0,
    periodKey: null,
    periodUnit: null,
    planLabel: 'Enterprise scans',
  };
}

export function getScanUsage(
  user: ScanUsageUser,
  now = new Date(),
  organizerAccount?: OrganizerAccountSnapshot | null,
): ScanUsage {
  if (isProUser(user)) {
    const periodKey = getScanPeriodKey(user.subscriptionPlan, now);
    const periodUnit = getScanPeriodUnit(user.subscriptionPlan);
    const baseLimit = getProScanLimit(user.subscriptionPlan);
    const bonus = getBonusScans(user);
    const limit = baseLimit + bonus;
    const used =
      user.monthlyScanMonth === periodKey ? Math.max(0, user.monthlyScanCount) : 0;
    const remaining = Math.max(0, limit - used);

    const planLabel = isEnterprisePlan(user.subscriptionPlan, user.plan)
      ? 'Enterprise'
      : isYearlyPlan(user.subscriptionPlan)
        ? 'Pro yearly'
        : 'Pro monthly';

    const proUsage: ScanUsage = {
      tier: 'pro',
      used,
      limit,
      remaining,
      exhausted: used >= limit,
      periodKey,
      periodUnit,
      planLabel,
    };

    if (!proUsage.exhausted) return proUsage;

    if (organizerAccount && organizerAccount.availableScans > 0) {
      return getWalletScanUsage(organizerAccount);
    }

    return proUsage;
  }

  const used = getFreeScansUsed(user);
  const limit = FREE_SCAN_LIMIT + getBonusScans(user);
  const remaining = Math.max(0, limit - used);

  const freeUsage: ScanUsage = {
    tier: 'free',
    used,
    limit,
    remaining,
    exhausted: used >= limit,
    periodKey: null,
    periodUnit: null,
    planLabel: 'Free',
  };

  if (!freeUsage.exhausted) return freeUsage;

  if (organizerAccount && organizerAccount.totalScansPurchased > 0) {
    return getWalletScanUsage(organizerAccount);
  }

  return freeUsage;
}

/**
 * Combined scan credits for UI — free tier + prepaid wallet (and pro + wallet for subscribers).
 * Reservation order is unchanged; this only affects displayed totals.
 */
export function getDisplayScanUsage(
  user: ScanUsageUser,
  now = new Date(),
  organizerAccount?: OrganizerAccountSnapshot | null,
): ScanUsage {
  const active = getScanUsage(user, now, organizerAccount);
  const hasWallet = (organizerAccount?.totalScansPurchased ?? 0) > 0;

  if (!hasWallet) {
    return active;
  }

  const walletUsed = Math.max(0, organizerAccount!.totalScansUsed);
  const walletLimit = organizerAccount!.totalScansPurchased;
  const walletRemaining = Math.max(0, organizerAccount!.availableScans);
  const walletPool: ScanCreditPool = {
    used: walletUsed,
    limit: walletLimit,
    remaining: walletRemaining,
  };

  if (isProUser(user)) {
    const periodKey = getScanPeriodKey(user.subscriptionPlan, now);
    const proUsed =
      user.monthlyScanMonth === periodKey ? Math.max(0, user.monthlyScanCount) : 0;
    const proLimit = getProScanLimit(user.subscriptionPlan) + getBonusScans(user);
    const proRemaining = Math.max(0, proLimit - proUsed);
    const proPool: ScanCreditPool = {
      used: proUsed,
      limit: proLimit,
      remaining: proRemaining,
    };

    const planLabel = isEnterprisePlan(user.subscriptionPlan, user.plan)
      ? 'Enterprise + Prepaid'
      : isYearlyPlan(user.subscriptionPlan)
        ? 'Pro yearly + Prepaid'
        : 'Pro monthly + Prepaid';

    return {
      tier: proRemaining > 0 ? 'pro' : active.tier,
      used: proUsed + walletUsed,
      limit: proLimit + walletLimit,
      remaining: proRemaining + walletRemaining,
      exhausted: proRemaining + walletRemaining <= 0,
      periodKey: active.periodKey,
      periodUnit: active.periodUnit,
      planLabel,
      breakdown: { pro: proPool, wallet: walletPool },
    };
  }

  const freeUsed = getFreeScansUsed(user);
  const freeLimit = FREE_SCAN_LIMIT + getBonusScans(user);
  const freeRemaining = Math.max(0, freeLimit - freeUsed);
  const freePool: ScanCreditPool = {
    used: freeUsed,
    limit: freeLimit,
    remaining: freeRemaining,
  };

  return {
    tier: freeRemaining > 0 ? 'free' : 'organizer',
    used: freeUsed + walletUsed,
    limit: freeLimit + walletLimit,
    remaining: freeRemaining + walletRemaining,
    exhausted: freeRemaining + walletRemaining <= 0,
    periodKey: null,
    periodUnit: null,
    planLabel: freeRemaining > 0 ? 'Free + Enterprise' : 'Enterprise scans',
    breakdown: { free: freePool, wallet: walletPool },
  };
}

export async function reserveFreeScan(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { scanCount: true, bonusScanCount: true, plan: true },
  });
  if (!user || user.plan !== 'FREE') return false;

  const maxScans = FREE_SCAN_LIMIT + Math.max(0, user.bonusScanCount);
  if (user.scanCount >= maxScans) return false;

  const result = await prisma.user.updateMany({
    where: { id: userId, plan: 'FREE', scanCount: { lt: maxScans } },
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { bonusScanCount: true, plan: true },
  });
  if (!user || (user.plan !== 'PAID' && user.plan !== 'ENTERPRISE')) return false;

  const limit = getProScanLimit(subscriptionPlan) + Math.max(0, user.bonusScanCount);

  const samePeriod = await prisma.user.updateMany({
    where: {
      id: userId,
      plan: { in: ['PAID', 'ENTERPRISE'] },
      monthlyScanMonth: periodKey,
      monthlyScanCount: { lt: limit },
    },
    data: { monthlyScanCount: { increment: 1 } },
  });
  if (samePeriod.count === 1) return true;

  const newPeriod = await prisma.user.updateMany({
    where: {
      id: userId,
      plan: { in: ['PAID', 'ENTERPRISE'] },
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
        plan: { in: ['PAID', 'ENTERPRISE'] },
        monthlyScanMonth: periodKey,
        monthlyScanCount: { gt: 0 },
      },
      data: { monthlyScanCount: { decrement: 1 } },
    })
    .catch((err) => console.error('[Scan Limits] Pro scan rollback failed:', err));
}

export type ScanReservationSource = 'free' | 'pro' | 'organizer_wallet';

export interface ScanReservation {
  userId: string;
  source: ScanReservationSource;
  periodKey: string | null;
  plan: string | null | undefined;
}

/** @deprecated Use reservation.source === 'pro' */
export type ScanReservationLegacy = ScanReservation & { isPro: boolean };

/** Reserve one scan for a verified user, or return a 403 response payload. */
export async function reserveScanForUser(
  user: ScanUsageUser,
): Promise<{ ok: true; reservation: ScanReservation } | { ok: false; response: NextResponse }> {
  const organizerAccount = await getOrganizerAccount(user.id);
  const usage = getScanUsage(user, new Date(), organizerAccount);

  if (usage.tier === 'pro' && !usage.exhausted) {
    const periodKey = usage.periodKey ?? getScanPeriodKey(user.subscriptionPlan);
    const reserved = await reserveProScan(user.id, user.subscriptionPlan, periodKey);
    if (reserved) {
      return {
        ok: true,
        reservation: {
          userId: user.id,
          source: 'pro',
          periodKey,
          plan: user.subscriptionPlan,
        },
      };
    }
  }

  if (usage.tier === 'free' && !usage.exhausted) {
    const reserved = await reserveFreeScan(user.id);
    if (reserved) {
      return {
        ok: true,
        reservation: {
          userId: user.id,
          source: 'free',
          periodKey: null,
          plan: null,
        },
      };
    }
  }

  if (organizerAccount && organizerAccount.availableScans > 0) {
    const reserved = await reserveOrganizerWalletScan(user.id);
    if (reserved) {
      return {
        ok: true,
        reservation: {
          userId: user.id,
          source: 'organizer_wallet',
          periodKey: null,
          plan: user.subscriptionPlan,
        },
      };
    }
  }

  const walletPurchased =
    organizerAccount && organizerAccount.totalScansPurchased > 0;
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: walletPurchased
          ? 'Prepaid scan credits exhausted. Top up to continue scanning.'
          : getScanLimitErrorMessage(usage),
        limitExceeded: true,
      },
      { status: 403 },
    ),
  };
}

export async function rollbackScanReservation(reservation: ScanReservation): Promise<void> {
  if (reservation.source === 'organizer_wallet') {
    await rollbackOrganizerWalletScan(reservation.userId);
    return;
  }
  if (reservation.source === 'pro') {
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
  if (usage.tier === 'organizer') {
    return 'Prepaid scan credits exhausted. Top up from Billing or buy a scan pack to continue.';
  }

  if (usage.tier === 'free') {
    return 'Scan limit exceeded. You have already used your 2 free scans. Subscribe to Pro or buy prepaid scans to continue.';
  }

  if (usage.periodUnit === 'year') {
    return `Yearly scan limit reached (${usage.limit.toLocaleString()} scans on your plan). Top up with prepaid scans or wait until January 1 for your quota to reset.`;
  }

  return `Monthly scan limit reached (${usage.limit.toLocaleString()} scans on your plan). Top up with prepaid scans or wait until the 1st for your quota to reset.`;
}

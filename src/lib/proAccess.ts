import { isEnterprisePlan } from '@/lib/planCatalog';
import {
  hasOrganizerWallet,
  type OrganizerAccountSnapshot,
} from '@/lib/organizerWallet';

/** Fields required to evaluate Pro subscription access. */
export type ProAccessUser = {
  plan: 'FREE' | 'PAID' | 'ENTERPRISE';
  subscriptionStatus?: string | null;
  subscriptionEnd?: Date | string | null;
  subscriptionExpiresAt?: Date | string | null;
  subscriptionPlan?: string | null;
};

function hasRemainingPaidPeriod(user: ProAccessUser): boolean {
  const periodEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
  return Boolean(periodEnd && periodEnd > new Date());
}

/**
 * Enterprise organizers — dedicated tier with library sharing.
 */
export function isEnterpriseUser(user: ProAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.plan === 'ENTERPRISE') return true;
  if (!isEnterprisePlan(user.subscriptionPlan, user.plan)) return false;

  if (user.subscriptionStatus === 'refunded' || user.subscriptionStatus === 'paused') {
    return false;
  }

  if (user.subscriptionStatus === 'active') return true;
  if (user.subscriptionStatus === 'authenticated' && hasRemainingPaidPeriod(user)) return true;
  if (user.subscriptionStatus === 'cancelled' && hasRemainingPaidPeriod(user)) return true;

  if (user.plan === 'PAID' && !user.subscriptionStatus) {
    if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date()) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a user has an active Pro subscription or valid premium access.
 * Enterprise users are included (same library/share features + more).
 */
export function isProUser(user: ProAccessUser | null | undefined): boolean {
  if (!user) return false;

  if (isEnterpriseUser(user)) return true;

  // Paused subscriptions stop billing — Pro access is suspended until resumed.
  if (user.subscriptionStatus === 'paused') {
    return false;
  }

  // Full refund — access ends immediately (not at period end).
  if (user.subscriptionStatus === 'refunded') {
    return false;
  }

  // 1. Check if the subscription is active
  if (user.subscriptionStatus === 'active') {
    return true;
  }

  const hasRemainingPeriod = hasRemainingPaidPeriod(user);

  // Mandate authorised; first charge scheduled for a future date (resubscribe during grace).
  if (user.subscriptionStatus === 'authenticated' && hasRemainingPeriod) {
    return true;
  }

  // 2. If the user cancelled but their subscription billing period hasn't ended yet
  if (user.subscriptionStatus === 'cancelled' && hasRemainingPeriod) {
    return true;
  }

  // 3. Fallback compatibility with old paid system or simulation logic
  if (user.plan === 'PAID' && !user.subscriptionStatus) {
    if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date()) {
      return true;
    }
  }

  return false;
}

/** Paid library + share access (Pro, Enterprise subscription, or prepaid wallet). */
export function hasPaidLibraryAccess(
  user: ProAccessUser | null | undefined,
  organizerAccount?: OrganizerAccountSnapshot | null,
): boolean {
  return isProUser(user) || hasOrganizerWallet(organizerAccount);
}

/** Pro subscription, Enterprise subscription, or organizer prepaid wallet. */
export function hasPremiumAccess(
  user: ProAccessUser | null | undefined,
  organizerAccount?: OrganizerAccountSnapshot | null,
): boolean {
  return hasPaidLibraryAccess(user, organizerAccount);
}

/** Enterprise subscription or pay-as-you-go scan wallet (for plan badge / avatar). */
export function isEnterpriseBranded(
  user: ProAccessUser | null | undefined,
  organizerAccount?: OrganizerAccountSnapshot | null,
): boolean {
  if (isEnterpriseUser(user)) return true;
  return hasOrganizerWallet(organizerAccount) && !isProUser(user);
}

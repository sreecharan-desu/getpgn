/** Fields required to evaluate Pro subscription access. */
export type ProAccessUser = {
  plan: 'FREE' | 'PAID';
  subscriptionStatus?: string | null;
  subscriptionEnd?: Date | string | null;
  subscriptionExpiresAt?: Date | string | null;
};

/**
 * Checks if a user has an active Pro subscription or valid premium access.
 */
export function isProUser(user: ProAccessUser | null | undefined): boolean {
  if (!user) return false;

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

  const periodEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
  const hasRemainingPeriod = Boolean(periodEnd && periodEnd > new Date());

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

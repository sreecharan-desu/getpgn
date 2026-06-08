import { User } from '@prisma/client';
import type { SessionUser } from '@/lib/session';

type ProAccessUser = Pick<
  User,
  | 'plan'
  | 'subscriptionStatus'
  | 'subscriptionEnd'
  | 'subscriptionExpiresAt'
>;

/**
 * Checks if a user has an active Pro subscription or valid premium access.
 */
export function isProUser(user: ProAccessUser | SessionUser | null | undefined): boolean {
  if (!user) return false;

  // 1. Check if the subscription is active
  if (user.subscriptionStatus === 'active') {
    return true;
  }

  // 2. If the user cancelled but their subscription billing period hasn't ended yet
  if (user.subscriptionStatus === 'cancelled' && user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date()) {
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

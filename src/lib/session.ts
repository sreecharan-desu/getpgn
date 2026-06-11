import jwt from 'jsonwebtoken';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { userAuthSelect, userSessionSelect } from './dbSelects';
import { getJwtSecret } from './security';
import {
  shouldSyncRazorpaySubscription,
  syncRazorpaySubscription,
} from './syncRazorpaySubscription';
import type { User } from '@prisma/client';

const COOKIE_NAME = 'getpgn_session';
const JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

export interface SessionPayload {
  userId: string;
  username: string;
}

export type SessionUser = Pick<
  User,
  | 'id'
  | 'username'
  | 'email'
  | 'emailVerified'
  | 'plan'
  | 'scanCount'
  | 'monthlyScanCount'
  | 'monthlyScanMonth'
  | 'bonusScanCount'
  | 'referralCode'
  | 'avatarPiece'
  | 'userRole'
  | 'onboardingCompleted'
  | 'subscriptionExpiresAt'
  | 'subscriptionId'
  | 'subscriptionPlan'
  | 'subscriptionStatus'
  | 'subscriptionStart'
  | 'subscriptionEnd'
  | 'paymentProvider'
  | 'createdAt'
  | 'updatedAt'
>;

export async function createSession(userId: string, username: string) {
  const token = jwt.sign({ userId, username }, getJwtSecret(), {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: JWT_ALGORITHMS,
    }) as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

type PostAuthUser = Pick<
  SessionUser,
  'emailVerified' | 'onboardingCompleted' | 'email'
>;

/** Post-login destination: email → verify → onboard → dashboard. */
export function getPostAuthRedirectPath(user: PostAuthUser): string {
  if (!user.email) {
    return '/signup/email';
  }
  if (!user.emailVerified) {
    return `/verify-email?email=${encodeURIComponent(user.email)}`;
  }
  if (!user.onboardingCompleted) {
    return '/onboarding';
  }
  return '/dashboard';
}

/** Where to send a signed-in user (verify-email gate or dashboard). Null if logged out. */
export async function getAuthenticatedRedirectPath(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await getCurrentUser();
  if (!user) return '/auth/logout';

  return getPostAuthRedirectPath(user);
}

function applySubscriptionExpiry(user: SessionUser): SessionUser {
  if (user.plan !== 'PAID' && user.plan !== 'ENTERPRISE') return user;

  const now = new Date();
  const expired =
    (user.subscriptionExpiresAt && now > user.subscriptionExpiresAt) ||
    (user.subscriptionEnd && now > user.subscriptionEnd);

  if (!expired) return user;

  return {
    ...user,
    plan: 'FREE',
    subscriptionExpiresAt: null,
    subscriptionStatus: 'expired',
  };
}

/** Lightweight session user — no password hash. Deduped per request via React cache. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session) return null;

  try {
    let user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: userSessionSelect,
    });

    if (!user) return null;

    if (shouldSyncRazorpaySubscription(user)) {
      const sync = await syncRazorpaySubscription(user);
      if (sync.updated) {
        user =
          (await prisma.user.findUnique({
            where: { id: session.userId },
            select: userSessionSelect,
          })) ?? user;
      }
    }

    const normalized = applySubscriptionExpiry(user);

    if (normalized.plan !== user.plan) {
      void prisma.user
        .update({
          where: { id: user.id },
          data: {
            plan: 'FREE',
            subscriptionExpiresAt: null,
            subscriptionStatus: 'expired',
          },
        })
        .catch((err) => console.error('[Session Auth] Failed to persist subscription expiry:', err));
    }

    return normalized;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2022') {
      console.error(
        '[Session Auth] Database schema is out of sync (missing column). Run: npm run db:sync',
      );
    } else {
      console.error('[Session Auth] Failed to load user for session:', err);
    }
    return null;
  }
});

/** True when a session cookie exists but the user row could not be loaded. */
export async function hasBrokenSession(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  return !user;
}

/** Authenticated user with a verified email — use for protected app routes. */
export async function getVerifiedUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user?.emailVerified) return null;
  return user;
}

/** Includes password hash — only for credential verification routes. */
export async function getCurrentUserWithPassword() {
  const session = await getSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: userAuthSelect,
  });
}

import { NextResponse } from 'next/server';
import { getSession, getCurrentUser, type SessionUser } from '@/lib/session';

export type VerifiedAuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/** Require a signed-in user with a verified email. */
export async function requireVerifiedUser(): Promise<VerifiedAuthResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 },
      ),
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'User not found.', code: 'USER_NOT_FOUND' },
        { status: 500 },
      ),
    };
  }

  if (!user.emailVerified) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Please verify your email before continuing.',
          code: 'EMAIL_NOT_VERIFIED',
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

/** Require any signed-in user (email verification not required). */
export async function requireAuthenticatedUser(): Promise<VerifiedAuthResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'User not found.', code: 'USER_NOT_FOUND' },
        { status: 500 },
      ),
    };
  }

  return { ok: true, user };
}

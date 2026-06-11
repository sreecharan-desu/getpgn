'use server';

import { redirect } from 'next/navigation';
import { debugLog } from '@/lib/debug';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession, getPostAuthRedirectPath } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
import { headers } from 'next/headers';

export type LoginFormState = {
  error?: string;
};

function getClientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headerList.get('x-real-ip')?.trim() || 'unknown';
}

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const loginId = String(formData.get('loginId') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  debugLog('login', 'server action', {
    loginId: loginId.includes('@') ? loginId : `[user:${loginId}]`,
  });

  if (!loginId || !password) {
    return { error: 'Please enter your username or email and password.' };
  }

  const headerList = await headers();
  const ip = getClientIpFromHeaders(headerList);
  const ipLimit = rateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
  if (!ipLimit.ok) {
    return { error: 'Too many sign-in attempts. Please wait a few minutes.' };
  }

  const rateKey = loginId.toLowerCase();
  const userLimit = rateLimit(`login:user:${rateKey}`, 10, 15 * 60_000);
  if (!userLimit.ok) {
    return { error: 'Too many sign-in attempts. Please wait a few minutes.' };
  }

  const isEmail = loginId.includes('@');
  const user = isEmail
    ? await prisma.user.findUnique({
        where: { email: loginId.toLowerCase() },
        select: {
          id: true,
          username: true,
          email: true,
          passwordHash: true,
          emailVerified: true,
          onboardingCompleted: true,
        },
      })
    : await prisma.user.findUnique({
        where: { username: loginId },
        select: {
          id: true,
          username: true,
          email: true,
          passwordHash: true,
          emailVerified: true,
          onboardingCompleted: true,
        },
      });

  if (!user) {
    return { error: 'Invalid username or password.' };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { error: 'Invalid username or password.' };
  }

  await createSession(user.id, user.username);
  debugLog('login', 'session created', { userId: user.id, username: user.username });

  redirect(getPostAuthRedirectPath(user));
}

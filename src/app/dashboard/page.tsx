import React from 'react';
import { redirect } from 'next/navigation';
import { getSession, getCurrentUser } from '@/lib/session';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';
import { savedGameListSelect } from '@/lib/dbSelects';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let user = null;

  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('[Dashboard Server] Failed to resolve current user:', err);
  }

  if (!user) {
    const session = await getSession();
    if (session) {
      redirect('/auth/logout');
    }
    redirect('/login');
  }

  if (!user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email ?? '')}`);
  }

  interface DbGame {
    id: string;
    title: string;
    movesJson: string;
    createdAt: Date;
    publicLink: {
      slug: string;
      enabled: boolean;
    } | null;
  }

  const isPro = isProUser(user);

  let savedGames: DbGame[] = [];
  if (isPro) {
    try {
      savedGames = await prisma.savedGame.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: savedGameListSelect,
      });
    } catch (err) {
      console.error('[Dashboard Server] Failed to load user games history:', err);
    }
  }

  // Sanitize data passed to Client Component
  const sanitizedUser = {
    id: user.id,
    username: user.username,
    plan: user.plan,
    scanCount: user.scanCount,
    subscriptionId: user.subscriptionId,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStart: user.subscriptionStart ? user.subscriptionStart.toISOString() : null,
    subscriptionEnd: user.subscriptionEnd ? user.subscriptionEnd.toISOString() : null,
    paymentProvider: user.paymentProvider
  };

  const isDevMode = process.env.IS_DEV === 'TRUE';

  const sanitizedGames = savedGames.map((game) => ({
    id: game.id,
    title: game.title,
    movesJson: game.movesJson,
    createdAt: game.createdAt.toISOString(),
    publicLink: game.publicLink
      ? {
          slug: game.publicLink.slug,
          enabled: game.publicLink.enabled,
        }
      : null,
  }));

  return (
    <DashboardClient 
      initialUser={sanitizedUser} 
      initialGames={sanitizedGames}
      isDevMode={isDevMode}
    />
  );
}

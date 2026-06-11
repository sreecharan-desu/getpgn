import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadWorkspacePageData } from '@/lib/workspacePageData';
import { buildPageMetadata } from '@/lib/og/metadata';
import { NOINDEX } from '@/lib/og/pages';
import DashboardClient from '@/app/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: 'Game replay',
    description:
      'Review a saved chess game with visual replay, move validation, and export tools on GetPGN.',
    path: `/game/${id}`,
    eyebrow: 'Workspace',
    ogSubtitle: 'Visual replay · validated moves',
    robots: NOINDEX,
  });
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id?.trim()) notFound();

  const data = await loadWorkspacePageData();

  return (
    <Suspense fallback={null}>
      <DashboardClient
        initialUser={data.user}
        initialGames={data.games}
        initialGamesTotal={data.gamesTotal}
        isDevMode={data.isDevMode}
        initialOrganizerAccount={data.organizerAccount}
        initialOrganizerPurchases={data.organizerPurchases}
        initialOrganizerPurchasesTotal={data.organizerPurchasesTotal}
        initialReferralBonusNotice={data.referralBonusNotice}
        workspaceView="game"
        initialGameId={id}
      />
    </Suspense>
  );
}

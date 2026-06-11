import React, { Suspense } from 'react';
import { loadWorkspacePageData } from '@/lib/workspacePageData';
import { dashboardMetadata } from '@/lib/og/pages';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';
export const metadata = dashboardMetadata();

export default async function DashboardPage() {
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
        workspaceView="upload"
      />
    </Suspense>
  );
}

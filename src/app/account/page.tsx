import React, { Suspense } from 'react';
import { loadWorkspacePageData } from '@/lib/workspacePageData';
import { accountMetadata } from '@/lib/og/pages';
import DashboardClient from '@/app/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';
export const metadata = accountMetadata();

export default async function AccountPage() {
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
        workspaceView="account"
      />
    </Suspense>
  );
}

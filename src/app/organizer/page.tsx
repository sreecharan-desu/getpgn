import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, getPostAuthRedirectPath } from '@/lib/session';
import { getOrganizerAccount } from '@/lib/organizerWallet';
import OrganizerPlanClient from './OrganizerPlanClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Prepaid scan credits',
  description:
    'Buy pay-as-you-go scan packs on GetPGN — use instead of a subscription or top up when your plan quota runs out.',
};

export default async function OrganizerPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/organizer');
  const postAuth = getPostAuthRedirectPath(user);
  if (postAuth !== '/dashboard') redirect(postAuth);

  const account = await getOrganizerAccount(user.id);

  return (
    <Suspense fallback={null}>
      <OrganizerPlanClient
        username={user.username}
        initialAccount={account}
      />
    </Suspense>
  );
}

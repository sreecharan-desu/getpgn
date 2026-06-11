import { redirect } from 'next/navigation';
import { getCurrentUser, getPostAuthRedirectPath } from '@/lib/session';
import { onboardingMetadata } from '@/lib/og/pages';
import OnboardingClient from './OnboardingClient';

export const dynamic = 'force-dynamic';
export const metadata = onboardingMetadata();

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.email) {
    redirect('/signup/email');
  }

  const next = getPostAuthRedirectPath(user);
  if (next !== '/onboarding') {
    redirect(next);
  }

  return <OnboardingClient username={user.username} />;
}

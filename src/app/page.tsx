import { redirect } from 'next/navigation';
import { getAuthenticatedRedirectPath } from '@/lib/session';
import { homeMetadata } from '@/lib/og/pages';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';
export const metadata = homeMetadata();

export default async function HomePage() {
  const redirectTo = await getAuthenticatedRedirectPath();
  if (redirectTo) redirect(redirectTo);
  return <HomeClient />;
}

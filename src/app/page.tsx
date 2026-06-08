import { redirect } from 'next/navigation';
import { getAuthenticatedRedirectPath } from '@/lib/session';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const redirectTo = await getAuthenticatedRedirectPath();
  if (redirectTo) redirect(redirectTo);
  return <HomeClient />;
}

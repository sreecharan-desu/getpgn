import { redirect } from 'next/navigation';
import { getAuthenticatedRedirectPath } from '@/lib/session';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const redirectTo = await getAuthenticatedRedirectPath();
  if (redirectTo) redirect(redirectTo);
  return <LoginClient />;
}

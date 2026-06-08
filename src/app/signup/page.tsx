import { redirect } from 'next/navigation';
import { getAuthenticatedRedirectPath } from '@/lib/session';
import SignupClient from './SignupClient';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const redirectTo = await getAuthenticatedRedirectPath();
  if (redirectTo) redirect(redirectTo);
  return <SignupClient />;
}

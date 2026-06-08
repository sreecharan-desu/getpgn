import { redirect } from 'next/navigation';
import { getAuthenticatedRedirectPath, getCurrentUser } from '@/lib/session';
import VerifyEmailClient from './VerifyEmailClient';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user?.emailVerified) {
    redirect('/dashboard');
  }

  const emailFromQuery = params.email?.trim() ?? '';
  const hasToken = Boolean(params.token);

  if (!user && !emailFromQuery && !hasToken) {
    redirect('/login');
  }

  return (
    <VerifyEmailClient initialEmail={user?.email ?? emailFromQuery} initialCooldownSeconds={null} />
  );
}

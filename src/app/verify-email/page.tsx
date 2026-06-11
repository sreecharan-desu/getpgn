import { redirect } from 'next/navigation';
import { getCurrentUser, getPostAuthRedirectPath } from '@/lib/session';
import { verifyEmailMetadata } from '@/lib/og/pages';
import VerifyEmailClient from './VerifyEmailClient';

export const dynamic = 'force-dynamic';
export const metadata = verifyEmailMetadata();

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const hasToken = Boolean(params.token);

  if (user) {
    if (!user.email) {
      redirect('/signup/email');
    }
    if (user.emailVerified) {
      redirect(getPostAuthRedirectPath(user));
    }
  } else if (!hasToken) {
    redirect('/login');
  }

  const emailFromQuery = params.email?.trim() ?? '';

  return (
    <VerifyEmailClient
      initialEmail={user?.email ?? emailFromQuery}
      initialCooldownSeconds={null}
      lockEmail={Boolean(user?.email)}
    />
  );
}

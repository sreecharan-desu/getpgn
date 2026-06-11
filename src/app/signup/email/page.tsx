import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, getPostAuthRedirectPath } from '@/lib/session';
import { signupEmailMetadata } from '@/lib/og/pages';
import AddEmailClient from './AddEmailClient';

export const dynamic = 'force-dynamic';
export const metadata = signupEmailMetadata();

export default async function SignupEmailPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/signup');
  }

  if (user.email) {
    const next = getPostAuthRedirectPath(user);
    if (next !== '/signup/email') {
      redirect(next);
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper text-[13px] text-muted">
          Loading…
        </div>
      }
    >
      <AddEmailClient username={user.username} />
    </Suspense>
  );
}

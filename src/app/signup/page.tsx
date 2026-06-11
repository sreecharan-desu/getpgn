import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser, getPostAuthRedirectPath } from '@/lib/session';
import { signupMetadata } from '@/lib/og/pages';
import SignupClient from './SignupClient';

export const dynamic = 'force-dynamic';
export const metadata = signupMetadata();

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(getPostAuthRedirectPath(user));
  }
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper text-muted text-[13px]">
          Loading…
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}

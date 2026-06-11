import { redirect } from 'next/navigation';
import { destroySession, getCurrentUser, getPostAuthRedirectPath, getSession } from '@/lib/session';
import { loginMetadata } from '@/lib/og/pages';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';
export const metadata = loginMetadata();

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const schemaError = params.error === 'schema';

  const session = await getSession();
  if (session) {
    const user = await getCurrentUser();
    if (user) {
      redirect(getPostAuthRedirectPath(user));
    }
    await destroySession();
  }

  return <LoginClient schemaError={schemaError} />;
}

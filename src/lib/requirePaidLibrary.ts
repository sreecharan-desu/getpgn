import { NextResponse } from 'next/server';
import { getOrganizerAccount } from '@/lib/organizerWallet';
import { hasPaidLibraryAccess, type ProAccessUser } from '@/lib/proAccess';

const LIBRARY_DENIED_MESSAGE =
  'Save and library features require Pro or prepaid scan credits.';

/** Pro subscription, Enterprise, or prepaid wallet — required for saved games. */
export async function requirePaidLibraryAccess(user: ProAccessUser & { id: string }) {
  const organizerAccount = await getOrganizerAccount(user.id);
  if (!hasPaidLibraryAccess(user, organizerAccount)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: LIBRARY_DENIED_MESSAGE }, { status: 403 }),
    };
  }
  return { ok: true as const, organizerAccount };
}

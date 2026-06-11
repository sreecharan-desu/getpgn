import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { hasOrganizerLibraryAccess } from '@/lib/organizerWallet';
import { publishAllSavedGames } from '@/lib/publishLibraryGames';

export async function POST() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    if (!(await hasOrganizerLibraryAccess(auth.user))) {
      return NextResponse.json(
        { error: 'Publishing requires a prepaid organizer scan pack.' },
        { status: 403 },
      );
    }

    const { published, sharedTotal } = await publishAllSavedGames(auth.user.id);

    return NextResponse.json({ success: true, published, sharedTotal });
  } catch (error) {
    console.error('[Library Publish Games] error:', error);
    return NextResponse.json(
      { error: 'Could not publish games to your library.' },
      { status: 500 },
    );
  }
}

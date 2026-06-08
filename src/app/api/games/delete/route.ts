import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!isProUser(user)) {
      return NextResponse.json({
        error: 'History management is only available for Paid plans. Please upgrade.'
      }, { status: 403 });
    }

    const { gameId } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });
    }

    // Ownership-scoped delete; cascade removes any associated PublicLink.
    const result = await prisma.savedGame.deleteMany({
      where: { id: gameId, userId: user.id }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(`[Database] Game ${gameId} deleted for user ${user.username}.`);

    return NextResponse.json({ success: true });

  } catch (error) {
    const err = error as Error;
    console.error('Delete game error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

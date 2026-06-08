import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';
import { savedGameListSelect } from '@/lib/dbSelects';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!isProUser(user)) {
      return NextResponse.json({
        error: 'History persistence is only available for Paid plans. Please upgrade.'
      }, { status: 403 });
    }

    const { pgn, title, movesJson } = await req.json();

    if (!pgn || !movesJson) {
      return NextResponse.json({ error: 'PGN and moves list are required.' }, { status: 400 });
    }

    const gameTitle = title || `Scanned Game - ${new Date().toLocaleDateString()}`;

    const game = await prisma.savedGame.create({
      data: {
        userId: user.id,
        title: gameTitle,
        pgn: pgn,
        movesJson: typeof movesJson === 'string' ? movesJson : JSON.stringify(movesJson)
      },
      select: { id: true, title: true, createdAt: true },
    });

    console.log(`[Database] Game saved successfully for user ${user.username}. ID: ${game.id}`);

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        title: game.title,
        createdAt: game.createdAt
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('Save game error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// GET all saved games for the current user
export async function GET() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!isProUser(user)) {
      return NextResponse.json({
        error: 'History logging is only accessible on active Paid plans.'
      }, { status: 403 });
    }

    const games = await prisma.savedGame.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: savedGameListSelect,
    });

    return NextResponse.json({ success: true, games });

  } catch (error) {
    const err = error as Error;
    console.error('Fetch games error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

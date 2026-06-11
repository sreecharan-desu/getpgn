import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { requirePaidLibraryAccess } from '@/lib/requirePaidLibrary';
import { savedGameListSelect } from '@/lib/dbSelects';
import { injectPlayerNamesIntoPgn, validatePlayerNames } from '@/lib/playerNames';
import {
  SAVED_GAMES_PAGE_SIZE,
  buildSavedGamesWhere,
  cursorFromGame,
  decodeSavedGameCursor,
} from '@/lib/savedGamesQuery';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const library = await requirePaidLibraryAccess(user);
    if (!library.ok) return library.response;

    const { pgn, title, movesJson, whitePlayer, blackPlayer } = await req.json();

    if (!pgn || !movesJson) {
      return NextResponse.json({ error: 'PGN and moves list are required.' }, { status: 400 });
    }

    const names = validatePlayerNames(whitePlayer, blackPlayer);
    if (!names.ok) {
      return NextResponse.json({ error: names.error }, { status: 400 });
    }

    const gameTitle = typeof title === 'string' && title.trim()
      ? title.trim()
      : `Scanned Game - ${new Date().toLocaleDateString()}`;

    if (gameTitle.length > 200) {
      return NextResponse.json({ error: 'Title too long (max 200 characters).' }, { status: 400 });
    }

    const pgnWithPlayers = injectPlayerNamesIntoPgn(
      pgn,
      names.whitePlayer,
      names.blackPlayer,
    );

    const game = await prisma.savedGame.create({
      data: {
        userId: user.id,
        title: gameTitle,
        whitePlayer: names.whitePlayer,
        blackPlayer: names.blackPlayer,
        pgn: pgnWithPlayers,
        movesJson: typeof movesJson === 'string' ? movesJson : JSON.stringify(movesJson),
      },
      select: {
        id: true,
        title: true,
        whitePlayer: true,
        blackPlayer: true,
        createdAt: true,
      },
    });

    console.log(`[Database] Game saved successfully for user ${user.username}. ID: ${game.id}`);

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        title: game.title,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        createdAt: game.createdAt,
      },
    });

  } catch (error) {
    const err = error as Error;
    console.error('Save game error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// GET paginated saved games for the current user
export async function GET(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const library = await requirePaidLibraryAccess(user);
    if (!library.ok) return library.response;

    const params = req.nextUrl.searchParams;
    const limitRaw = parseInt(params.get('limit') || String(SAVED_GAMES_PAGE_SIZE), 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : SAVED_GAMES_PAGE_SIZE));
    const search = params.get('search')?.trim() || undefined;
    const afterCursor = decodeSavedGameCursor(params.get('cursor'));

    const where = buildSavedGamesWhere(user.id, search, afterCursor);
    const listWhere = buildSavedGamesWhere(user.id, search, null);

    const [games, total] = await Promise.all([
      prisma.savedGame.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        select: savedGameListSelect,
      }),
      prisma.savedGame.count({ where: listWhere }),
    ]);

    const hasMore = games.length === limit;
    const nextCursor =
      hasMore && games.length > 0 ? cursorFromGame(games[games.length - 1]!) : null;

    return NextResponse.json({
      success: true,
      games: games.map((game) => ({
        ...game,
        createdAt: game.createdAt.toISOString(),
      })),
      total,
      hasMore,
      nextCursor,
    });

  } catch (error) {
    const err = error as Error;
    console.error('Fetch games error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

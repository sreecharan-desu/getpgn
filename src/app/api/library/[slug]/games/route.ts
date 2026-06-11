import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  LIBRARY_GAMES_PAGE_SIZE,
  buildLibraryGamesWhere,
  libraryGamesOrderBy,
  type LibrarySort,
} from '@/lib/libraryGamesQuery';
import { cursorFromGame, decodeSavedGameCursor } from '@/lib/savedGamesQuery';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const library = await prisma.organizerLibrary.findUnique({
      where: { slug },
      select: { userId: true, enabled: true },
    });

    if (!library?.enabled) {
      return NextResponse.json({ error: 'Library not found.' }, { status: 404 });
    }

    const params = req.nextUrl.searchParams;
    const limitRaw = parseInt(params.get('limit') || String(LIBRARY_GAMES_PAGE_SIZE), 10);
    const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : LIBRARY_GAMES_PAGE_SIZE));
    const search = params.get('search')?.trim() || undefined;
    const player = params.get('player')?.trim() || undefined;
    const sortRaw = params.get('sort');
    const sort: LibrarySort = sortRaw === 'oldest' ? 'oldest' : 'newest';
    const afterCursor = decodeSavedGameCursor(params.get('cursor'));

    const listWhere = buildLibraryGamesWhere(library.userId, { search, player, sort });
    const pageWhere = buildLibraryGamesWhere(library.userId, {
      search,
      player,
      afterCursor,
      sort,
    });

    const [games, total] = await Promise.all([
      prisma.savedGame.findMany({
        where: pageWhere,
        orderBy: [...libraryGamesOrderBy(sort)],
        take: limit,
        select: {
          id: true,
          title: true,
          whitePlayer: true,
          blackPlayer: true,
          movesJson: true,
          createdAt: true,
          publicLink: { select: { slug: true } },
        },
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
        shareSlug: game.publicLink?.slug ?? null,
      })),
      total,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error('[Library Games] error:', error);
    return NextResponse.json({ error: 'Could not load library games.' }, { status: 500 });
  }
}

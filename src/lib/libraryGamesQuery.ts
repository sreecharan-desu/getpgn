import type { SavedGameCursor } from '@/lib/savedGamesQuery';

export const LIBRARY_GAMES_INITIAL_PAGE_SIZE = 20;
export const LIBRARY_GAMES_PAGE_SIZE = 20;

export type LibrarySort = 'newest' | 'oldest';

export function buildLibraryGamesWhere(
  userId: string,
  opts: {
    search?: string;
    player?: string;
    afterCursor?: SavedGameCursor | null;
    sort?: LibrarySort;
  },
) {
  const { search, player, afterCursor, sort = 'newest' } = opts;
  const q = search?.trim();
  const playerQ = player?.trim();

  const andClauses: Record<string, unknown>[] = [
    { userId },
    { publicLink: { enabled: true } },
  ];

  if (q) {
    andClauses.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { whitePlayer: { contains: q, mode: 'insensitive' } },
        { blackPlayer: { contains: q, mode: 'insensitive' } },
        { movesJson: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (playerQ) {
    andClauses.push({
      OR: [
        { whitePlayer: { contains: playerQ, mode: 'insensitive' } },
        { blackPlayer: { contains: playerQ, mode: 'insensitive' } },
      ],
    });
  }

  if (afterCursor) {
    if (sort === 'oldest') {
      andClauses.push({
        OR: [
          { createdAt: { gt: new Date(afterCursor.createdAt) } },
          {
            AND: [
              { createdAt: new Date(afterCursor.createdAt) },
              { id: { gt: afterCursor.id } },
            ],
          },
        ],
      });
    } else {
      andClauses.push({
        OR: [
          { createdAt: { lt: new Date(afterCursor.createdAt) } },
          {
            AND: [
              { createdAt: new Date(afterCursor.createdAt) },
              { id: { lt: afterCursor.id } },
            ],
          },
        ],
      });
    }
  }

  return { AND: andClauses };
}

export function libraryGamesOrderBy(sort: LibrarySort = 'newest') {
  return sort === 'oldest'
    ? ([{ createdAt: 'asc' as const }, { id: 'asc' as const }] as const)
    : ([{ createdAt: 'desc' as const }, { id: 'desc' as const }] as const);
}

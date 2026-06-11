/** Shared saved-games list pagination — cursor-based, newest first. */

/** First paint on dashboard — keep small for large libraries. */
export const SAVED_GAMES_INITIAL_PAGE_SIZE = 5;

/** Each scroll / “load more” batch. */
export const SAVED_GAMES_PAGE_SIZE = 20;

export type SavedGameCursor = {
  createdAt: string;
  id: string;
};

export function encodeSavedGameCursor(cursor: SavedGameCursor): string {
  return `${cursor.createdAt}|${cursor.id}`;
}

export function decodeSavedGameCursor(raw: string | null | undefined): SavedGameCursor | null {
  if (!raw?.trim()) return null;
  const sep = raw.lastIndexOf('|');
  if (sep <= 0) return null;
  const createdAt = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  if (!createdAt || !id) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return { createdAt: date.toISOString(), id };
}

export function cursorFromGame(game: { id: string; createdAt: string | Date }): string {
  const createdAt =
    typeof game.createdAt === 'string'
      ? game.createdAt
      : game.createdAt.toISOString();
  return encodeSavedGameCursor({ createdAt, id: game.id });
}

export function buildSavedGamesWhere(
  userId: string,
  search: string | undefined,
  afterCursor: SavedGameCursor | null,
) {
  const q = search?.trim();
  const searchFilter = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { whitePlayer: { contains: q, mode: 'insensitive' as const } },
          { blackPlayer: { contains: q, mode: 'insensitive' as const } },
          { movesJson: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : null;

  const cursorFilter = afterCursor
    ? {
        OR: [
          { createdAt: { lt: new Date(afterCursor.createdAt) } },
          {
            AND: [
              { createdAt: new Date(afterCursor.createdAt) },
              { id: { lt: afterCursor.id } },
            ],
          },
        ],
      }
    : null;

  const andClauses = [
    { userId },
    { isDraft: false },
    ...(searchFilter ? [searchFilter] : []),
    ...(cursorFilter ? [cursorFilter] : []),
  ];

  return { AND: andClauses };
}

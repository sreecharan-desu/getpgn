export interface SearchableSavedGame {
  id: string;
  title: string;
  whitePlayer?: string;
  blackPlayer?: string;
  movesJson?: string;
  createdAt: string;
  publicLink?: { slug: string; enabled: boolean } | null;
}

function formatSearchDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()}`;
}

function extractMoveText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'notation' in value) {
    const notation = (value as { notation?: unknown }).notation;
    return typeof notation === 'string' ? notation : '';
  }
  return '';
}

/** Client-side filter for saved game library search. */
export function filterSavedGames<T extends SearchableSavedGame>(
  games: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return games;

  return games.filter((game) => {
    if (game.title.toLowerCase().includes(q)) return true;
    if (game.whitePlayer?.toLowerCase().includes(q)) return true;
    if (game.blackPlayer?.toLowerCase().includes(q)) return true;
    if (game.id.toLowerCase().includes(q)) return true;
    if (formatSearchDate(game.createdAt).includes(q)) return true;
    if (
      game.publicLink &&
      (q === 'shared' ||
        q === 'share' ||
        'shared'.includes(q) ||
        'share'.includes(q))
    ) {
      return true;
    }

    if (!game.movesJson) return false;

    try {
      const moves = JSON.parse(game.movesJson) as Array<{
        white?: unknown;
        black?: unknown;
      }>;

      for (const turn of moves) {
        const white = extractMoveText(turn.white).toLowerCase();
        const black = extractMoveText(turn.black).toLowerCase();
        if (white.includes(q) || black.includes(q)) return true;
      }
    } catch {
      return false;
    }

    return false;
  });
}

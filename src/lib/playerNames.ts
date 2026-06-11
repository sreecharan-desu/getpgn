const PGN_TAG = (tag: string, pgn: string) => {
  const match = pgn.match(
    new RegExp(`\\[${tag}\\s+"([^"]*)"]`, 'i'),
  );
  const value = match?.[1]?.trim();
  return value && value !== '?' ? value : '';
};

/** Generic PGN / scan defaults — not a user-chosen name. */
export function isDefaultPlayerName(
  value: string | undefined | null,
  color: 'white' | 'black',
): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  return color === 'white' ? trimmed === 'White' : trimmed === 'Black';
}

/** Board / menu label — maps generic defaults to Player 1 / Player 2. */
export function displayPlayerName(
  value: string | undefined | null,
  color: 'white' | 'black',
): string {
  if (isDefaultPlayerName(value, color)) {
    return color === 'white' ? 'Player 1' : 'Player 2';
  }
  return value!.trim();
}

/** Best-effort player names and title from PGN headers (for scan drafts). */
export function parseMetadataFromPgn(pgn: string): {
  whitePlayer: string;
  blackPlayer: string;
  title: string;
} {
  const white = PGN_TAG('White', pgn) || 'White';
  const black = PGN_TAG('Black', pgn) || 'Black';
  const event = PGN_TAG('Event', pgn);
  const round = PGN_TAG('Round', pgn);
  const date = new Date().toLocaleDateString('en-CA');

  let title = event || `Scanned game · ${date}`;
  if (event && round) title = `${event} — Round ${round}`;
  else if (!event && white && black) title = `${white} vs ${black}`;

  return { whitePlayer: white, blackPlayer: black, title };
}

/** Validate and normalize player names before saving a game. */
export function validatePlayerNames(white: unknown, black: unknown): {
  ok: true;
  whitePlayer: string;
  blackPlayer: string;
} | { ok: false; error: string } {
  const whitePlayer = typeof white === 'string' ? white.trim() : '';
  const blackPlayer = typeof black === 'string' ? black.trim() : '';

  if (!whitePlayer || whitePlayer.length < 1) {
    return { ok: false, error: 'White player name is required.' };
  }
  if (!blackPlayer || blackPlayer.length < 1) {
    return { ok: false, error: 'Black player name is required.' };
  }
  if (whitePlayer.length > 80 || blackPlayer.length > 80) {
    return { ok: false, error: 'Player names must be 80 characters or fewer.' };
  }

  return { ok: true, whitePlayer, blackPlayer };
}

/** Inject or replace White/Black tags in PGN headers. */
export function injectPlayerNamesIntoPgn(
  pgn: string,
  whitePlayer: string,
  blackPlayer: string,
): string {
  const lines = pgn.split('\n');
  const headerKeys = new Set(['White', 'Black']);
  const kept = lines.filter((line) => {
    const match = line.match(/^\[(\w+)\s/);
    return !match || !headerKeys.has(match[1]!);
  });

  const headerBlock = [
    `[White "${whitePlayer.replace(/"/g, '\\"')}"]`,
    `[Black "${blackPlayer.replace(/"/g, '\\"')}"]`,
  ];

  const firstMoveIdx = kept.findIndex(
    (line) => line.trim() && !line.trim().startsWith('['),
  );
  if (firstMoveIdx === -1) {
    return [...kept.filter((l) => l.trim()), ...headerBlock, ''].join('\n');
  }

  return [
    ...kept.slice(0, firstMoveIdx).filter((l) => l.trim() || l === ''),
    ...headerBlock,
    ...kept.slice(firstMoveIdx),
  ].join('\n');
}

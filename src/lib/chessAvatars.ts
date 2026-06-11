export const CHESS_AVATAR_PIECES = [
  "king",
  "queen",
  "rook",
  "bishop",
  "knight",
  "pawn",
] as const;

export type ChessAvatarPiece = (typeof CHESS_AVATAR_PIECES)[number];

export const CHESS_AVATAR_LABELS: Record<ChessAvatarPiece, string> = {
  king: "King",
  queen: "Queen",
  rook: "Rook",
  bishop: "Bishop",
  knight: "Knight",
  pawn: "Pawn",
};

export function isChessAvatarPiece(value: string): value is ChessAvatarPiece {
  return (CHESS_AVATAR_PIECES as readonly string[]).includes(value);
}

/** Deterministic default piece from username — used at signup. */
export function defaultAvatarPiece(username: string): ChessAvatarPiece {
  let h = 2166136261;
  const s = (username || "user").trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return CHESS_AVATAR_PIECES[h % CHESS_AVATAR_PIECES.length];
}

export function resolveAvatarPiece(
  stored: string | null | undefined,
  username: string,
): ChessAvatarPiece {
  if (stored && isChessAvatarPiece(stored)) return stored;
  return defaultAvatarPiece(username);
}

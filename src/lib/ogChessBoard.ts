import { fenFromMovesJson } from "@/components/ui/BoardThumbnail";

const GLYPH: Record<string, string> = {
  p: "\u265F",
  n: "\u265E",
  b: "\u265D",
  r: "\u265C",
  q: "\u265B",
  k: "\u265A",
};

export interface OgBoardSquare {
  glyph: string | null;
  isWhitePiece: boolean;
  isLight: boolean;
}

function parseBoard(fen: string): string[] {
  const board = fen.split(" ")[0] || "";
  const rows = board.split("/");
  const squares: string[] = [];

  for (let r = 0; r < 8; r++) {
    const row = rows[r] ?? "8";
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        const n = parseInt(ch, 10);
        for (let i = 0; i < n; i++) squares.push("");
      } else if (GLYPH[ch.toLowerCase()]) {
        squares.push(ch);
      }
    }
  }

  while (squares.length < 64) squares.push("");
  return squares.slice(0, 64);
}

export function getOgBoardSquares(movesJson: string): OgBoardSquare[] {
  const fen = fenFromMovesJson(movesJson);
  return parseBoard(fen).map((piece, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return {
      glyph: piece ? GLYPH[piece.toLowerCase()] : null,
      isWhitePiece: piece !== "" && piece === piece.toUpperCase(),
      isLight: (row + col) % 2 === 0,
    };
  });
}

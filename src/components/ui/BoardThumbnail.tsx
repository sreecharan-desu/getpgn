import React from "react";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Filled chess glyphs — we recolor (not reshape) per side for a clean monochrome look. */
const GLYPH: Record<string, string> = {
  p: "\u265F", // ♟
  n: "\u265E", // ♞
  b: "\u265D", // ♝
  r: "\u265C", // ♜
  q: "\u265B", // ♛
  k: "\u265A", // ♚
};

interface PlyLike {
  fen?: string | null;
  status?: string;
}
interface TurnLike {
  white?: PlyLike | null;
  black?: PlyLike | null;
}

/**
 * Derive a board FEN from a saved game's `movesJson`.
 * Uses the FEN after the last *valid* ply; falls back to the start position.
 */
export function fenFromMovesJson(movesJson: string | null | undefined): string {
  if (!movesJson) return START_FEN;
  try {
    const turns = JSON.parse(movesJson) as TurnLike[];
    if (!Array.isArray(turns)) return START_FEN;
    let fen = START_FEN;
    for (const turn of turns) {
      for (const ply of [turn?.white, turn?.black]) {
        if (ply && ply.status === "valid" && typeof ply.fen === "string" && ply.fen) {
          fen = ply.fen;
        }
      }
    }
    return fen;
  } catch {
    return START_FEN;
  }
}

/** Expand the board portion of a FEN into 64 square chars ("" = empty). */
function parseBoard(fen: string): string[] {
  const board = (fen || START_FEN).split(" ")[0] || "";
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

interface BoardThumbnailProps {
  /** Explicit FEN. If omitted, derived from `movesJson`. */
  fen?: string;
  movesJson?: string | null;
  /** Pixel size of the square board. */
  size?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * Tiny, dependency-free chessboard preview rendered from a FEN string.
 * Pure CSS grid + Unicode glyphs — safe to render many at once. Monochrome:
 * subtle two-tone grey squares, ink pieces, outlined white pieces.
 */
const BoardThumbnail: React.FC<BoardThumbnailProps> = ({
  fen,
  movesJson,
  size = 46,
  className = "",
  "aria-label": ariaLabel = "Board preview",
}) => {
  const resolved = fen ?? fenFromMovesJson(movesJson);
  const squares = parseBoard(resolved);
  const glyphSize = size / 8;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`grid grid-cols-8 overflow-hidden rounded-[7px] border border-line-strong bg-paper shadow-[0_1px_2px_rgba(10,10,10,0.05)] ${className}`}
      style={{ width: size, height: size }}
    >
      {squares.map((piece, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const isLight = (row + col) % 2 === 0;
        const isWhite = piece !== "" && piece === piece.toUpperCase();
        return (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ background: isLight ? "#f3f3f3" : "#dedede" }}
          >
            {piece && (
              <span
                style={{
                  fontSize: glyphSize * 0.92,
                  lineHeight: 1,
                  color: isWhite ? "#ffffff" : "#0a0a0a",
                  WebkitTextStroke: isWhite ? "0.6px #0a0a0a" : "0px",
                  textShadow: isWhite ? "0 0.5px 0.5px rgba(10,10,10,0.25)" : "none",
                  userSelect: "none",
                }}
              >
                {GLYPH[piece.toLowerCase()]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(BoardThumbnail);

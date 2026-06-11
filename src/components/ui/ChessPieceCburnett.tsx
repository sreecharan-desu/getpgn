import React from "react";
import type { ChessAvatarPiece } from "@/lib/chessAvatars";
import "chessground/assets/chessground.cburnett.css";

export interface ChessPieceCburnettProps {
  piece: ChessAvatarPiece;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Cburnett piece glyphs — same artwork as the interactive board (chessground).
 * Renders theme-aware white/black variants via CSS so SSR stays in sync.
 */
export const ChessPieceCburnett: React.FC<ChessPieceCburnettProps> = ({
  piece,
  className = "",
  style,
}) => (
  <span
    className={`cg-wrap gp-cburnett-icon ${className}`.trim()}
    style={style}
    aria-hidden="true"
  >
    {React.createElement("piece", { className: `${piece} black dark:hidden` })}
    {React.createElement("piece", {
      className: `${piece} white hidden dark:block`,
    })}
  </span>
);

export default ChessPieceCburnett;

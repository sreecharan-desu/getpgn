import React from "react";
import {
  type ChessAvatarPiece,
  CHESS_AVATAR_LABELS,
  resolveAvatarPiece,
} from "@/lib/chessAvatars";
import { ChessPieceCburnett } from "./ChessPieceCburnett";

interface ChessPieceAvatarProps {
  piece?: string | null;
  username: string;
  size?: number;
  isPro?: boolean;
  className?: string;
}

/**
 * Circular chess-piece avatar using the same Cburnett glyphs as the board.
 */
export const ChessPieceAvatar: React.FC<ChessPieceAvatarProps> = ({
  piece,
  username,
  size = 40,
  isPro = false,
  className = "",
}) => {
  const resolved = resolveAvatarPiece(piece, username);
  const markSize = size * 0.78;

  return (
    <span
      className={`gp-chess-avatar relative inline-grid place-items-center rounded-full ${className}`}
      style={{ width: size, height: size }}
      title={`${CHESS_AVATAR_LABELS[resolved]} avatar`}
      aria-label={`${CHESS_AVATAR_LABELS[resolved]} avatar for ${username}`}
      data-pro={isPro ? "true" : undefined}
    >
      <ChessPieceCburnett
        piece={resolved}
        className="relative z-[1]"
        style={{ width: markSize, height: markSize }}
      />
    </span>
  );
};

export type { ChessAvatarPiece };
export default ChessPieceAvatar;

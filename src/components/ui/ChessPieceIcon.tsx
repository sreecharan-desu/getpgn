import React from "react";
import type { ChessAvatarPiece } from "@/lib/chessAvatars";
import { ChessPieceCburnett } from "./ChessPieceCburnett";

interface ChessPieceIconProps {
  piece: ChessAvatarPiece;
  className?: string;
  style?: React.CSSProperties;
}

/** Board-matched Cburnett piece icon for avatars and pickers. */
export const ChessPieceIcon: React.FC<ChessPieceIconProps> = ({
  piece,
  className,
  style,
}) => (
  <ChessPieceCburnett piece={piece} className={className} style={style} />
);

export default ChessPieceIcon;

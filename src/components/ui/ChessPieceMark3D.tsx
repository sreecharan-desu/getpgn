import React from "react";
import type { ChessAvatarPiece } from "@/lib/chessAvatars";
import { QueenMark3D } from "./QueenMark3D";

export interface ChessPieceMark3DProps extends React.SVGProps<SVGSVGElement> {
  piece: ChessAvatarPiece;
  /** Unique prefix for SVG gradient ids when many avatars render on one page. */
  idPrefix?: string;
}

function SharedDefs({ p }: { p: string }) {
  return (
    <defs>
      <linearGradient id={`${p}-body`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#525257" />
        <stop offset="34%" stopColor="#262629" />
        <stop offset="100%" stopColor="#060607" />
      </linearGradient>
      <radialGradient id={`${p}-spec`} cx="36%" cy="24%" r="58%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}-rim`} cx="84%" cy="62%" r="44%">
        <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#cfd2da" stopOpacity="0.4" />
      </radialGradient>
      <linearGradient id={`${p}-crown`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3c3c40" />
        <stop offset="100%" stopColor="#050506" />
      </linearGradient>
      <radialGradient id={`${p}-bead`} cx="34%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#8a8a90" />
        <stop offset="42%" stopColor="#2a2a2d" />
        <stop offset="100%" stopColor="#050506" />
      </radialGradient>
      <linearGradient id={`${p}-base`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a3a3e" />
        <stop offset="100%" stopColor="#070708" />
      </linearGradient>
    </defs>
  );
}

function GlossBody({
  p,
  d,
  highlight,
}: {
  p: string;
  d: string;
  highlight?: string;
}) {
  return (
    <>
      <path d={d} fill={`url(#${p}-body)`} />
      <path d={d} fill={`url(#${p}-rim)`} />
      <path d={d} fill={`url(#${p}-spec)`} />
      {highlight ? (
        <path d={highlight} fill="#ffffff" opacity="0.16" />
      ) : null}
    </>
  );
}

function BasePedestal({ p }: { p: string }) {
  return (
    <>
      <ellipse cx="50" cy="88" rx="22" ry="4.5" fill={`url(#${p}-base)`} />
      <rect x="30" y="78" width="40" height="8" rx="4" fill={`url(#${p}-base)`} />
      <rect x="34" y="73" width="32" height="6" rx="3" fill={`url(#${p}-crown)`} />
    </>
  );
}

/** Glossy 3D Staunton marks — shared visual language with the GetPGN queen brand. */
export const ChessPieceMark3D: React.FC<ChessPieceMark3DProps> = ({
  piece,
  idPrefix,
  className,
  ...props
}) => {
  const p = idPrefix ?? `gpp-${piece}`;

  if (piece === "queen") {
    return <QueenMark3D idPrefix={p} className={className} {...props} viewBox="0 0 240 300" />;
  }

  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="presentation"
      aria-hidden="true"
      {...props}
    >
      <SharedDefs p={p} />

      {piece === "king" && (
        <>
          <GlossBody
            p={p}
            d="M34 38 C30 48 28 58 28 66 C28 76 38 82 50 82 C62 82 72 76 72 66 C72 58 70 48 66 38 Z"
            highlight="M38 42 C36 52 35 62 38 72 C40 74 44 74 46 72 C43 62 44 52 47 44 C44 41 40 41 38 42 Z"
          />
          <rect x="38" y="30" width="24" height="5" rx="2.5" fill={`url(#${p}-crown)`} />
          <path
            d="M42 18 H58 V30 H42 Z M47 12 H53 V18 H47 Z M44 12 H56 V15 H44 Z"
            fill={`url(#${p}-crown)`}
          />
          <circle cx="50" cy="24" r="3.5" fill={`url(#${p}-bead)`} />
          <BasePedestal p={p} />
        </>
      )}

      {piece === "rook" && (
        <>
          <path
            d="M36 34 H40 V28 H44 V34 H48 V28 H52 V34 H56 V28 H60 V34 H64 V38 H36 Z"
            fill={`url(#${p}-crown)`}
          />
          <GlossBody
            p={p}
            d="M34 38 C30 48 28 58 28 66 C28 76 38 82 50 82 C62 82 72 76 72 66 C72 58 70 48 66 38 Z"
          />
          <BasePedestal p={p} />
        </>
      )}

      {piece === "bishop" && (
        <>
          <path
            d="M50 16 C40 16 34 24 34 34 C34 42 38 48 44 52 C36 56 30 64 30 72 C30 78 38 80 50 80 C62 80 70 78 70 72 C70 64 64 56 56 52 C62 48 66 42 66 34 C66 24 60 16 50 16 Z"
            fill={`url(#${p}-body)`}
          />
          <path
            d="M50 16 C40 16 34 24 34 34 C34 42 38 48 44 52 C36 56 30 64 30 72 C30 78 38 80 50 80 C62 80 70 78 70 72 C70 64 64 56 56 52 C62 48 66 42 66 34 C66 24 60 16 50 16 Z"
            fill={`url(#${p}-spec)`}
          />
          <ellipse cx="50" cy="22" rx="4" ry="2.5" fill={`url(#${p}-bead)`} />
          <rect x="47" y="54" width="6" height="8" rx="1" fill={`url(#${p}-crown)`} />
          <BasePedestal p={p} />
        </>
      )}

      {piece === "knight" && (
        <>
          <path
            d="M32 78 C30 72 30 64 34 56 C38 48 46 42 54 40 C50 36 50 30 54 26 C58 22 64 22 68 28 C72 34 70 42 64 46 C72 50 78 58 78 68 C78 74 74 80 68 82 L32 78 Z"
            fill={`url(#${p}-body)`}
          />
          <path
            d="M32 78 C30 72 30 64 34 56 C38 48 46 42 54 40 C50 36 50 30 54 26 C58 22 64 22 68 28 C72 34 70 42 64 46 C72 50 78 58 78 68 C78 74 74 80 68 82 L32 78 Z"
            fill={`url(#${p}-spec)`}
          />
          <circle cx="62" cy="34" r="2.5" fill={`url(#${p}-bead)`} />
          <rect x="30" y="80" width="42" height="5" rx="2" fill={`url(#${p}-base)`} />
          <rect x="26" y="84" width="50" height="4" rx="2" fill={`url(#${p}-base)`} />
        </>
      )}

      {piece === "pawn" && (
        <>
          <circle cx="50" cy="34" r="11" fill={`url(#${p}-body)`} />
          <circle cx="50" cy="34" r="11" fill={`url(#${p}-spec)`} />
          <circle cx="46" cy="30" r="3" fill="#ffffff" opacity="0.45" />
          <path
            d="M38 44 C38 44 36 52 38 54 H62 C64 52 62 44 62 44 C62 44 56 48 50 48 C44 48 38 44 38 44 Z"
            fill={`url(#${p}-crown)`}
          />
          <GlossBody
            p={p}
            d="M34 54 C30 62 28 70 28 72 C28 78 38 82 50 82 C62 82 72 78 72 72 C72 70 70 62 66 54 Z"
          />
          <BasePedestal p={p} />
        </>
      )}
    </svg>
  );
};

export default ChessPieceMark3D;

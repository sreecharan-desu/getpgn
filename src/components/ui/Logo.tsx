"use client";

import React, { useId } from "react";
import { QueenMark3D } from "./QueenMark3D";

interface LogoProps {
  className?: string;
  wordmarkSize?: "sm" | "md" | "lg";
  /** When false, renders wordmark only (no queen mark). */
  showMark?: boolean;
  showWordmark?: boolean;
}

const WORDMARK_SIZE = {
  sm: "text-[15px]",
  md: "text-[17px]",
  lg: "text-[20px]",
} as const;

const MARK_TILE = {
  sm: 26,
  md: 30,
  lg: 34,
} as const;

const Wordmark: React.FC<{ size: keyof typeof WORDMARK_SIZE; className?: string }> = ({
  size,
  className = "",
}) => (
  <span
    className={`gp-wordmark inline-flex select-none items-baseline font-[family-name:var(--font-audiowide)] font-normal tracking-[0.05em] ${WORDMARK_SIZE[size]} ${className}`}
  >
    <span className="text-ink transition-colors group-hover/logo:text-ink">Get</span>
    <span className="text-muted transition-colors group-hover/logo:text-muted-2">PGN</span>
  </span>
);

/** GetPGN lockup — glossy 3D queen mark + Audiowide wordmark. */
export const Logo: React.FC<LogoProps> = ({
  className = "",
  wordmarkSize = "md",
  showMark = true,
  showWordmark = true,
}) => {
  const idPrefix = useId().replace(/:/g, "");
  const tile = MARK_TILE[wordmarkSize];

  if (!showMark) {
    return showWordmark ? (
      <span className={`group/logo inline-flex ${className}`}>
        <Wordmark size={wordmarkSize} />
      </span>
    ) : null;
  }

  return (
    <span
      className={`group/logo inline-flex select-none items-center gap-2.5 ${className}`}
    >
      <span
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-[11px] border border-line/80 bg-gradient-to-b from-paper to-surface shadow-[0_1px_2px_rgba(10,10,10,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.08]"
        style={{ width: tile, height: tile }}
        aria-hidden="true"
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(10,10,10,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,10,0.04) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
        <QueenMark3D
          idPrefix={idPrefix}
          className="relative z-[1] h-[78%] w-[78%]"
        />
      </span>
      {showWordmark ? <Wordmark size={wordmarkSize} /> : null}
    </span>
  );
};

export default Logo;

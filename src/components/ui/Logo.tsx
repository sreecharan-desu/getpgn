import React from "react";

/**
 * GetPGN brand queen mark.
 *
 * Staunton-inspired silhouette — few geometric paths, reads clearly from
 * favicon to header. Uses `currentColor`. Sync with /public/logo.svg and
 * /public/favicon.svg.
 */
export const QueenMark: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M17 50V35.5C17 31.2 20.8 28 25.2 29.2L32 21.5C34.1 19.6 37 19.6 39.1 21.5L45.5 29.5L50 11L54.5 29.5L60.9 21.5C63 19.6 65.9 19.6 68 21.5L74.8 29.2C79.2 28 83 31.2 83 35.5V50H17Z" />
    <circle cx="50" cy="14.5" r="3.5" />
    <path d="M21 50H79V57H21V50Z" />
    <path d="M26 57.5C27.8 67.5 26.2 75.8 22.5 79.5H77.5C73.8 75.8 72.2 67.5 74 57.5H26Z" />
    <path d="M19 79.5H81V85C81 86.4 79.9 87.5 78.5 87.5H21.5C20.1 87.5 19 86.4 19 85V79.5Z" />
    <path d="M14 87.5H86V92.5C86 94.9 84.2 96.5 82 96.5H18C15.8 96.5 14 94.9 14 92.5V87.5Z" />
  </svg>
);

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  /** When false, renders wordmark only (no queen mark / tile). */
  showMark?: boolean;
  tile?: boolean;
  className?: string;
  /** Wordmark scale when `showMark` is false. */
  wordmarkSize?: "sm" | "md" | "lg";
}

const WORDMARK_SIZE = {
  sm: { get: "text-[14px]", pgn: "text-[12px]", gap: "gap-[0.0625rem]" },
  md: { get: "text-[16px]", pgn: "text-[13px]", gap: "gap-[0.125rem]" },
  lg: { get: "text-[18px]", pgn: "text-[15px]", gap: "gap-[0.125rem]" },
} as const;

const Wordmark: React.FC<{
  className?: string;
  size?: keyof typeof WORDMARK_SIZE;
}> = ({ className = "", size = "md" }) => {
  const s = WORDMARK_SIZE[size];
  return (
    <span
      className={`gp-wordmark inline-flex items-baseline ${s.gap} ${className}`}
    >
      <span
        className={`${s.get} font-bold tracking-[-0.065em] text-ink transition-colors group-hover/logo:text-ink`}
      >
        Get
      </span>
      <span
        className={`${s.pgn} font-[family-name:var(--font-geist-mono)] font-normal tracking-[-0.03em] text-muted transition-colors group-hover/logo:text-muted-2`}
      >
        PGN
      </span>
    </span>
  );
};

/** Full GetPGN lockup — mark + wordmark. */
export const Logo: React.FC<LogoProps> = ({
  size = 28,
  showWordmark = true,
  showMark = true,
  tile = true,
  className = "",
  wordmarkSize = "md",
}) => {
  const markInner = Math.round(size * 0.56);

  if (!showMark && showWordmark) {
    return (
      <span className={`group/logo inline-flex select-none ${className}`}>
        <Wordmark size={wordmarkSize} />
      </span>
    );
  }

  return (
    <span className={`group/logo inline-flex items-center gap-[0.625rem] select-none ${className}`}>
      {tile ? (
        <span
          className="relative grid place-items-center overflow-hidden rounded-[11px] bg-gradient-to-b from-ink-soft to-ink text-paper shadow-[0_1px_2px_rgba(10,10,10,0.16)] ring-1 ring-black/[0.06] dark:ring-white/[0.1]"
          style={{ width: size, height: size }}
        >
          <span
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,transparent_45%)]"
            aria-hidden
          />
          <QueenMark style={{ width: markInner, height: markInner }} />
        </span>
      ) : (
        <QueenMark className="text-ink" style={{ width: size, height: size }} />
      )}
      {showWordmark && (
        <Wordmark size={size >= 32 ? "md" : "sm"} />
      )}
    </span>
  );
};

export default Logo;

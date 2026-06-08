"use client";

import React from "react";

/* ============================================================
   Skeleton — token-themed loading placeholders for GetPGN.

   Self-contained: the base tint + shimmer keyframes are injected
   once via a styled-jsx *global* block (deduped by Next), so this
   file never touches globals.css. Works in both light & dark since
   it reads design tokens (`--color-line`, `--color-surface-2`) that
   flip under the `.dark` scope, plus a `.dark`-scoped shine tint.

   The shimmer is gated behind `prefers-reduced-motion: no-preference`
   so reduced-motion users get a calm static placeholder.
   ============================================================ */

type Rounded = "sm" | "md" | "lg" | "full";

const RADIUS: Record<Rounded, string> = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  full: "9999px",
};

/** Injected once (styled-jsx global dedupes identical blocks). */
const SkeletonStyles: React.FC = () => (
  <style jsx global>{`
    .gp-skel {
      --gp-skel-shine: rgba(255, 255, 255, 0.7);
      position: relative;
      overflow: hidden;
      background-color: var(--color-line);
      flex: none;
    }
    .dark .gp-skel {
      --gp-skel-shine: rgba(255, 255, 255, 0.06);
    }
    .gp-skel::after {
      content: "";
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--gp-skel-shine) 50%,
        transparent 100%
      );
    }
    @media (prefers-reduced-motion: no-preference) {
      .gp-skel::after {
        animation: gp-skel-shimmer 1.6s ease-in-out infinite;
      }
    }
    @keyframes gp-skel-shimmer {
      100% {
        transform: translateX(100%);
      }
    }
  `}</style>
);

interface SkeletonProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  rounded?: Rounded;
  circle?: boolean;
}

/**
 * Base placeholder block. Decorative by default (`aria-hidden`) — wrap
 * groups of these in a composed skeleton that carries the `role="status"`.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  rounded = "md",
  circle = false,
}) => (
  <>
    <SkeletonStyles />
    <span
      aria-hidden="true"
      className={`gp-skel block ${className}`}
      style={{
        width,
        height,
        borderRadius: circle ? "9999px" : RADIUS[rounded],
      }}
    />
  </>
);

/** Visually-hidden status label for composed skeletons (no extra CSS deps). */
const SrLabel: React.FC<{ children: string }> = ({ children }) => (
  <span
    style={{
      position: "absolute",
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      whiteSpace: "nowrap",
      border: 0,
    }}
  >
    {children}
  </span>
);

interface StatusWrapProps {
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

/** Container that announces a loading state to assistive tech. */
const StatusWrap: React.FC<StatusWrapProps> = ({
  className = "",
  "aria-label": ariaLabel = "Loading…",
  children,
}) => (
  <div role="status" aria-busy="true" className={`relative ${className}`}>
    <SrLabel>{ariaLabel}</SrLabel>
    {children}
  </div>
);

interface SkeletonTextProps {
  /** Number of stacked line skeletons. */
  lines?: number;
  /** Width of the final (typically shorter) line. */
  width?: number | string;
  className?: string;
  "aria-label"?: string;
}

/** N stacked text-line placeholders with realistic line-height + gap. */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  width = "60%",
  className = "",
  "aria-label": ariaLabel = "Loading content…",
}) => (
  <StatusWrap aria-label={ariaLabel} className={`flex flex-col gap-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="0.75rem"
        rounded="sm"
        width={i === lines - 1 ? width : "100%"}
      />
    ))}
  </StatusWrap>
);

interface RowSkeletonProps {
  className?: string;
}

/**
 * Mirrors a "Saved Games" list row: 48px BoardThumbnail tile + a title
 * line and a meta line. Box matches the real row (`p-2.5 rounded-xl
 * border`) so swapping in real content causes no layout shift.
 */
export const SavedGameRowSkeleton: React.FC<RowSkeletonProps> = ({
  className = "",
}) => (
  <StatusWrap
    aria-label="Loading saved game…"
    className={`flex items-center gap-3 p-2.5 rounded-xl border border-line bg-paper ${className}`}
  >
    <Skeleton width={48} height={48} rounded="lg" />
    <span className="min-w-0 flex-1">
      <Skeleton height="0.8125rem" width="70%" rounded="sm" />
      <span className="block h-1" />
      <Skeleton height="0.75rem" width="45%" rounded="sm" />
    </span>
  </StatusWrap>
);

/**
 * Mirrors a "Billing history" line item: a 36px icon tile + description
 * lines, a date, an amount, and a status pill — laid out on the same
 * responsive grid the real row uses.
 */
export const BillingRowSkeleton: React.FC<RowSkeletonProps> = ({
  className = "",
}) => (
  <StatusWrap
    aria-label="Loading billing history…"
    className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-2 items-center px-5 sm:px-7 py-4 ${className}`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <Skeleton width={36} height={36} rounded="lg" />
      <div className="min-w-0 flex flex-col gap-1.5">
        <Skeleton height="0.875rem" width={140} rounded="sm" />
        <Skeleton height="0.75rem" width={96} rounded="sm" />
      </div>
    </div>
    <Skeleton height="0.75rem" width={84} rounded="sm" className="sm:justify-self-end" />
    <Skeleton height="0.875rem" width={52} rounded="sm" className="sm:justify-self-end" />
    <Skeleton height={24} width={68} rounded="full" className="sm:justify-self-end" />
  </StatusWrap>
);

type RowVariant = "savedGame" | "billing";

/** Pill / chip placeholder (status badges, tags). */
export const SkeletonBadge: React.FC<{ width?: number | string; className?: string }> = ({
  width = 72,
  className = "",
}) => (
  <Skeleton height={22} width={width} rounded="full" className={className} />
);

/** Mirrors `btn-sm` — height 2rem, rounded 10px. */
export const SkeletonButton: React.FC<{
  width?: number | string;
  className?: string;
  primary?: boolean;
}> = ({ width = 96, className = "", primary = false }) => (
  <Skeleton
    height={32}
    width={width}
    rounded="md"
    className={primary ? `${className} opacity-90` : className}
  />
);

/** Square icon button — playback controls, theme toggle, etc. */
export const SkeletonIconButton: React.FC<{ className?: string }> = ({
  className = "",
}) => <Skeleton width={36} height={36} rounded="md" className={className} />;

/** 8×8 chessboard placeholder inside the GetPGN board frame. */
export const SkeletonChessBoard: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    className={`gp-chess-board__frame mx-auto w-full max-w-[min(100%,520px)] ${className}`}
    aria-hidden="true"
  >
    <div className="gp-chess-board__surface">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-0 overflow-hidden rounded-[8px]">
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const light = (row + col) % 2 === 0;
          return (
            <Skeleton
              key={i}
              className={`h-full w-full rounded-none ${light ? "opacity-55" : "opacity-85"}`}
              rounded="sm"
            />
          );
        })}
      </div>
    </div>
  </div>
);

interface SkeletonListProps {
  /** How many row skeletons to render. */
  count: number;
  /** Which built-in row skeleton to repeat. Ignored when `renderItem` is set. */
  variant?: RowVariant;
  /** Custom row renderer; overrides `variant` when provided. */
  renderItem?: (index: number) => React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

const ROW_GAP: Record<RowVariant, string> = {
  savedGame: "space-y-1.5",
  billing: "space-y-0",
};

/** Repeats a row skeleton `count` times with layout-consistent gaps. */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  count,
  variant = "savedGame",
  renderItem,
  className = "",
  "aria-label": ariaLabel = "Loading list…",
}) => {
  const Row = variant === "billing" ? BillingRowSkeleton : SavedGameRowSkeleton;
  return (
    <div
      role="status"
      aria-busy="true"
      className={`relative ${renderItem ? "" : ROW_GAP[variant]} ${className}`}
    >
      <SrLabel>{ariaLabel}</SrLabel>
      {Array.from({ length: count }).map((_, i) =>
        renderItem ? (
          <React.Fragment key={i}>{renderItem(i)}</React.Fragment>
        ) : (
          <Row key={i} />
        ),
      )}
    </div>
  );
};

export default Skeleton;

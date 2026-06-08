"use client";

import React from "react";
import {
  Skeleton,
  SkeletonBadge,
  SkeletonButton,
  SkeletonChessBoard,
  SkeletonIconButton,
  SavedGameRowSkeleton,
} from "@/components/ui/Skeleton";

const SkelLabel: React.FC<{ children: string }> = ({ children }) => (
  <span className="sr-only">{children}</span>
);

/** Back to upload + validated badge row. */
export function SkeletonReviewToolbar() {
  return (
    <div className="card flex items-center justify-between px-4 py-2.5">
      <SkeletonButton width={132} />
      <SkeletonBadge width={108} />
    </div>
  );
}

/** Visual replay card — header controls, board, FEN row. */
export function SkeletonBoardPanel() {
  return (
    <div className="card min-w-0 shrink-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton height={16} width={108} rounded="sm" />
          <Skeleton height={12} width={160} rounded="sm" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton height={32} width={88} rounded="md" />
          <SkeletonIconButton />
          <SkeletonButton width={92} />
        </div>
      </div>
      <div className="bg-surface px-2 py-3 sm:px-3 sm:py-4">
        <SkeletonChessBoard />
        <Skeleton height={12} width={200} rounded="sm" className="mx-auto mt-3" />
      </div>
      <div className="border-t border-line px-5 py-3">
        <div className="flex items-center gap-2 overflow-hidden rounded-[10px] border border-line bg-paper px-3 py-2">
          <Skeleton height={10} width={28} rounded="sm" />
          <Skeleton height={14} className="min-w-0 flex-1" rounded="sm" />
          <SkeletonButton width={64} />
        </div>
      </div>
    </div>
  );
}

/** PGN output card — header, action buttons, text block. */
export function SkeletonPgnPanel() {
  return (
    <div className="card flex h-full min-h-0 flex-col overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Skeleton height={16} width={88} rounded="sm" />
          <SkeletonBadge width={72} />
        </div>
        <div className="flex gap-2">
          <SkeletonButton width={88} />
          <SkeletonButton width={96} primary />
        </div>
      </div>
      <div className="flex min-h-[8rem] flex-1 flex-col gap-2 p-4 sm:p-5">
        <Skeleton height={12} width="92%" rounded="sm" />
        <Skeleton height={12} width="78%" rounded="sm" className="flex-1 min-h-[4rem]" />
        <Skeleton height={12} width="85%" rounded="sm" />
        <Skeleton height={12} width="64%" rounded="sm" />
      </div>
    </div>
  );
}

/** Move sheet — header, playback bar, two-column move grid. */
export function SkeletonMoveListPanel() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-paper">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton height={16} width={88} rounded="sm" />
          <SkeletonBadge width={64} />
        </div>
        <div className="flex gap-1 rounded-lg border border-line-strong bg-paper p-0.5">
          <Skeleton height={28} width={52} rounded="md" />
          <Skeleton height={28} width={52} rounded="md" />
        </div>
      </div>

      <div className="border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <Skeleton height={12} width={100} rounded="sm" />
          <Skeleton height={24} width={88} rounded="md" />
        </div>
        <Skeleton height={4} className="mt-2.5 w-full" rounded="full" />
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          <SkeletonIconButton />
          <SkeletonIconButton />
          <SkeletonButton width={88} primary />
          <SkeletonIconButton />
          <SkeletonIconButton />
        </div>
      </div>

      <div className="flex-1 space-y-0 p-3">
        {Array.from({ length: 6 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-[2.5rem_1fr_1fr] overflow-hidden rounded-lg border border-line"
          >
            <div className="flex items-center justify-center border-r border-line bg-surface px-2 py-3">
              <Skeleton height={12} width={16} rounded="sm" />
            </div>
            <div className="flex items-center justify-center border-r border-line px-2 py-3">
              <Skeleton height={14} width={48} rounded="sm" />
            </div>
            <div className="flex items-center justify-center px-2 py-3">
              <Skeleton height={14} width={44} rounded="sm" />
            </div>
          </div>
        ))}
        <SkeletonButton width="100%" className="mt-2" />
      </div>
    </div>
  );
}

/** Save & share sidebar block. */
export function SkeletonSharePanel() {
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-line px-4 py-3">
        <Skeleton height={10} width={72} rounded="sm" />
        <Skeleton height={14} width={120} rounded="sm" className="mt-2" />
      </div>
      <div className="space-y-3 p-4">
        <Skeleton height={40} width="100%" rounded="md" />
        <div className="flex gap-2">
          <SkeletonButton width="100%" primary className="flex-1" />
          <SkeletonButton width={72} />
        </div>
      </div>
    </div>
  );
}

/** Lichess / Chess.com external links. */
export function SkeletonAnalyzeElsewhere() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton height={10} width={108} rounded="sm" className="px-1" />
      <SkeletonButton width="100%" />
      <SkeletonButton width="100%" />
    </div>
  );
}

/** Game snapshot sidebar card. */
export function SkeletonGameSnapshot() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton width={14} height={14} rounded="sm" />
        <Skeleton height={10} width={96} rounded="sm" />
      </div>
      <Skeleton height={14} width="75%" rounded="sm" className="mb-3" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-2 flex items-center justify-between gap-3">
          <Skeleton height={12} width={56} rounded="sm" />
          <Skeleton height={12} width={32} rounded="sm" />
        </div>
      ))}
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
        <SkeletonBadge width={56} />
        <SkeletonBadge width={64} />
        <SkeletonBadge width={72} />
      </div>
    </div>
  );
}

/** Saved games sidebar panel. */
export function SkeletonSavedGamesPanel() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-line/50 bg-surface/20 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3 border-b border-line/40 px-4 py-3.5">
        <div className="space-y-1.5">
          <Skeleton height={10} width={64} rounded="sm" />
          <Skeleton height={14} width={96} rounded="sm" />
        </div>
        <SkeletonBadge width={48} />
      </div>
      <div className="space-y-1.5 p-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SavedGameRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Full sidebar while session restores. */
export function SidebarRestoreSkeleton() {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 self-start lg:sticky lg:top-[88px]">
      <SkeletonSavedGamesPanel />
      <SkeletonSharePanel />
      <SkeletonButton width="100%" />
      <SkeletonAnalyzeElsewhere />
      <SkeletonGameSnapshot />
    </div>
  );
}

/** Full review workspace while session restores. */
export function WorkspaceRestoreSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-5 pb-2"
      role="status"
      aria-busy="true"
      aria-label="Loading your game…"
    >
      <SkelLabel>Loading your game…</SkelLabel>
      <SkeletonReviewToolbar />
      <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.98fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <SkeletonBoardPanel />
          <SkeletonPgnPanel />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <SkeletonMoveListPanel />
          <SkeletonButton width="100%" />
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { BookOpen } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

interface SavedGameLoadingOverlayProps {
  title: string;
}

/** Full-screen bridge while a saved game is fetched and the review workspace opens. */
export function SavedGameLoadingOverlay({ title }: SavedGameLoadingOverlayProps) {
  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/92 backdrop-blur-md gp-fade-in"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Opening ${title}`}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="gp-saved-game-load-icon mb-5 grid h-16 w-16 place-items-center rounded-2xl">
          <BookOpen className="h-7 w-7 text-ink" strokeWidth={1.75} />
        </div>
        <Spinner size={22} className="text-ink" />
        <p className="mt-5 text-[15px] font-semibold tracking-tight text-ink">
          Opening saved game
        </p>
        <p className="mt-1.5 max-w-[18rem] truncate text-[13px] text-muted">{title}</p>
        <p className="mt-3 text-[12px] text-muted-2">Loading moves and board position…</p>
      </div>
    </div>,
    document.body,
  );
}

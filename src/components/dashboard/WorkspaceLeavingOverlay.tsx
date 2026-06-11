"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { LayoutDashboard } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

/** Covers the workspace while routing back to the dashboard — avoids empty-state flash. */
export function WorkspaceLeavingOverlay() {
  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/94 backdrop-blur-md gp-fade-in"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Returning to dashboard"
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center px-6 text-center">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface shadow-[var(--shadow-soft)]">
          <LayoutDashboard className="h-7 w-7 text-ink" strokeWidth={1.75} />
        </div>
        <Spinner size={22} className="text-ink" />
        <p className="mt-5 text-[15px] font-semibold tracking-tight text-ink">
          Returning to dashboard
        </p>
        <p className="mt-1.5 text-[13px] text-muted">Just a moment…</p>
      </div>
    </div>,
    document.body,
  );
}

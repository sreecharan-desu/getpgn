"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "./Logo";
import { QueenMascot } from "./QueenMascot";

interface StatusShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  showBack?: boolean;
}

/** Polished full-screen states — logout, 404, and other transitions. */
export function StatusShell({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
  showBack = true,
}: StatusShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-paper text-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,var(--color-surface)_0%,var(--color-paper)_42%,transparent_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--color-surface-2)_0%,transparent_70%)] opacity-60 blur-2xl"
        aria-hidden
      />

      {showBack && (
        <header className="relative z-10 border-b border-line/60 bg-paper/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-5 sm:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
              Back to home
            </Link>
          </div>
        </header>
      )}

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-20">
        <div className="gp-fade-up flex w-full max-w-[400px] flex-col items-center text-center">
          <QueenMascot interactive className="!max-w-[120px] sm:!max-w-[132px]" />
          <Logo size={28} className="mt-8" />
          {eyebrow ? (
            <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-2">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 text-[clamp(1.5rem,4vw,1.875rem)] font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-[20rem] text-[14px] leading-relaxed text-muted">{subtitle}</p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
          {actions ? <div className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">{actions}</div> : null}
        </div>
      </main>
    </div>
  );
}

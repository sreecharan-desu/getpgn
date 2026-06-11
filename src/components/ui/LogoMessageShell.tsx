import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "./Logo";

type LogoMessageShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showBack?: boolean;
};

/** Full-page status — logo “speaks” the message in a speech bubble. */
export function LogoMessageShell({
  eyebrow,
  title,
  subtitle,
  actions,
  showBack = true,
}: LogoMessageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-paper text-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,var(--color-surface)_0%,var(--color-paper)_42%,transparent_100%)]"
        aria-hidden
      />

      {showBack ? (
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
      ) : null}

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-20">
        <div className="gp-fade-up flex w-full max-w-md flex-col items-center text-center">
          <div className="relative flex flex-col items-center">
            <Logo wordmarkSize="lg" showWordmark={false} />
            <div
              className="relative mt-4 w-full max-w-[22rem] rounded-2xl border border-line/80 bg-surface/60 px-5 py-4 text-left shadow-[var(--shadow-soft)] backdrop-blur-sm"
              role="status"
            >
              <div
                className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-line/80 bg-surface/60"
                aria-hidden
              />
              {eyebrow ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-2">
                  {eyebrow}
                </p>
              ) : null}
              <h1
                className={`font-semibold tracking-tight text-ink ${
                  eyebrow ? "mt-1.5 text-[1.35rem] leading-snug" : "text-[1.35rem] leading-snug"
                }`}
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{subtitle}</p>
              ) : null}
            </div>
          </div>

          {actions ? (
            <div className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
              {actions}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

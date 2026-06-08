"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "./Logo";

interface AuthSplitLayoutProps {
  title: string;
  subtitle?: string;
  panelHeadline: string;
  panelCopy: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  title,
  subtitle,
  panelHeadline,
  panelCopy,
  children,
  footer,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
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

      <div className="grid flex-1 lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="gpq-backdrop" aria-hidden="true" />
          <div className="relative z-10 flex w-full max-w-md flex-col items-center px-10">
            <Logo wordmarkSize="lg" />
            <div className="mt-8 text-center">
              <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                {panelHeadline}
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-muted">
                {panelCopy}
              </p>
            </div>
          </div>
          <style>{backdropCss}</style>
        </aside>

        <main className="flex items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[400px] gp-fade-up">
            <div className="rounded-[20px] border border-line bg-paper p-7 shadow-[var(--shadow-pop)] sm:p-8">
              <div className="mb-6 flex flex-col items-center text-center">
                <Logo wordmarkSize="md" />
                <h1 className="mt-5 text-[21px] font-semibold tracking-tight text-ink">{title}</h1>
                {subtitle && <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>}
              </div>

              {children}

              {footer && <p className="mt-6 text-center text-[13px] text-muted">{footer}</p>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const backdropCss = `
.gpq-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 28%, var(--color-paper) 0%, var(--color-surface) 48%, var(--color-surface-2) 100%);
}
.gpq-backdrop::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(0deg, rgba(10,10,10,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(10,10,10,0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  -webkit-mask-image: radial-gradient(80% 70% at 50% 45%, #000 30%, transparent 78%);
  mask-image: radial-gradient(80% 70% at 50% 45%, #000 30%, transparent 78%);
}
.dark .gpq-backdrop::before {
  background-image:
    linear-gradient(0deg, rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
}
.gpq-backdrop::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 40%;
  width: 70%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0));
}
.dark .gpq-backdrop::after {
  background: radial-gradient(closest-side, rgba(255,255,255,0.08), rgba(255,255,255,0));
}
`;

export default AuthSplitLayout;

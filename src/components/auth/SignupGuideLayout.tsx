"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { QueenMascot } from "@/components/ui/QueenMascot";
import {
  SIGNUP_GUIDE,
  SIGNUP_STEP_INDEX,
  SIGNUP_STEP_TOTAL,
  type SignupGuideStep,
} from "@/lib/signupFlow";

interface SignupGuideLayoutProps {
  step: SignupGuideStep;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  /** Override default guide copy (e.g. email step with username). */
  title?: string;
  subtitle?: string;
  guideHeadline?: string;
  guideCopy?: string;
  /** Wider right column for plan pickers on large screens. */
  contentWidth?: "compact" | "wide";
}

export function SignupGuideLayout({
  step,
  children,
  footer,
  backHref = "/",
  backLabel = "Back to home",
  showBack = true,
  title,
  subtitle,
  guideHeadline,
  guideCopy,
  contentWidth = "compact",
}: SignupGuideLayoutProps) {
  const guide = SIGNUP_GUIDE[step];
  const stepNum = SIGNUP_STEP_INDEX[step];
  const isWide = contentWidth === "wide";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-5 sm:px-8">
          {showBack ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
              {backLabel}
            </Link>
          ) : (
            <span />
          )}
        </div>
      </header>

      <div
        className={`grid flex-1 ${
          isWide
            ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:grid-cols-[minmax(280px,2fr)_minmax(0,3.2fr)]"
            : "lg:grid-cols-2"
        }`}
      >
        <aside className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="gpq-backdrop" aria-hidden="true" />
          <div
            className={`relative z-10 flex w-full flex-col items-center px-10 ${
              isWide ? "max-w-lg" : "max-w-md"
            }`}
          >
            <QueenMascot interactive className={isWide ? "!max-w-[200px]" : undefined} />
            <div className="mt-8 text-center gp-fade-up">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                Your guide · step {stepNum} of {SIGNUP_STEP_TOTAL}
              </p>
              <h2
                className={`mt-3 font-semibold leading-tight tracking-[-0.02em] text-ink ${
                  isWide ? "text-[clamp(1.5rem,2.2vw,2rem)]" : "text-[26px]"
                }`}
              >
                {guideHeadline ?? guide.headline}
              </h2>
              <p
                className={`mx-auto mt-3 text-[14px] leading-relaxed text-muted ${
                  isWide ? "max-w-md" : "max-w-xs"
                }`}
              >
                {guideCopy ?? guide.copy}
              </p>
            </div>
          </div>
          <style>{backdropCss}</style>
        </aside>

        <main
          className={`flex px-4 py-10 sm:px-6 ${
            isWide
              ? "items-start justify-center lg:px-8 lg:py-12 xl:px-12"
              : "items-center justify-center"
          }`}
        >
          <div
            className={`w-full gp-fade-up ${
              isWide ? "max-w-[400px] lg:max-w-none" : "max-w-[400px]"
            }`}
          >
            <div className="mb-4 lg:hidden">
              <QueenMascot interactive className="!max-w-[120px]" />
              <p className="mt-3 text-center text-[12px] font-medium text-muted">
                {guideHeadline ?? guide.headline}
              </p>
            </div>

            <div
              className={`rounded-[20px] border border-line bg-paper shadow-[var(--shadow-pop)] ${
                isWide ? "p-7 sm:p-8 lg:rounded-[24px] lg:p-10 xl:p-12" : "p-7 sm:p-8"
              }`}
            >
              <div className="mb-5">
                <SignupProgress current={stepNum} total={SIGNUP_STEP_TOTAL} />
              </div>

              <div
                className={`mb-6 flex flex-col ${
                  isWide
                    ? "items-start text-left lg:mb-8"
                    : "items-center text-center"
                }`}
              >
                <Logo
                  wordmarkSize={isWide ? "md" : "md"}
                  className={isWide ? "" : "justify-center"}
                />
                <h1
                  className={`font-semibold tracking-tight text-ink ${
                    isWide
                      ? "mt-5 text-[clamp(1.35rem,2vw,1.75rem)]"
                      : "mt-5 text-[21px]"
                  }`}
                >
                  {title ?? guide.title}
                </h1>
                {(subtitle ?? guide.subtitle) ? (
                  <p className="mt-1.5 text-[13px] text-muted">{subtitle ?? guide.subtitle}</p>
                ) : null}
              </div>

              {children}

              {footer ? (
                <p className="mt-6 text-center text-[13px] text-muted">{footer}</p>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SignupProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              active ? "bg-ink" : done ? "bg-ink/35" : "bg-line-strong"
            }`}
          />
        );
      })}
    </div>
  );
}

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

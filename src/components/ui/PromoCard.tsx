"use client";

import React from "react";
import { ChevronRight, X } from "lucide-react";

export interface PromoCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  ctaLabel: string;
  onCta: () => void;
  ctaLoading?: boolean;
  onDismiss?: () => void;
  className?: string;
}

/** Compact sidebar-style promo — icon, copy, text CTA, dismiss. */
export function PromoCard({
  icon,
  title,
  children,
  ctaLabel,
  onCta,
  ctaLoading = false,
  onDismiss,
  className = "",
}: PromoCardProps) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface/90 p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center text-ink" aria-hidden="true">
            {icon}
          </span>
          <p className="text-[13px] font-semibold tracking-tight text-ink">{title}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted-2 transition-colors hover:bg-paper hover:text-ink"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 text-[12px] leading-relaxed text-muted">{children}</div>

      <button
        type="button"
        onClick={onCta}
        disabled={ctaLoading}
        className="mt-3 inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {ctaLabel}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

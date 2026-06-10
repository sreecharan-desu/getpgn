"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { FREE_SCAN_LIMIT } from "@/components/dashboard/FreePlanUI";
import { PricingSectionContent } from "@/components/pricing/PricingSectionContent";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  scanCount: number;
  isPro: boolean;
  billingLoading: boolean;
  initialInterval?: "monthly" | "yearly";
  /** Shown when resubscribing during cancelled grace (mandate-only checkout). */
  mandateNotice?: string | null;
  onSelectMonthly: () => void;
  onSelectYearly: () => void;
}

export function PricingModal({
  open,
  onClose,
  scanCount,
  isPro,
  billingLoading,
  mandateNotice,
  onSelectMonthly,
  onSelectYearly,
}: PricingModalProps) {
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  if (!open) return null;

  const scansLeft = Math.max(0, FREE_SCAN_LIMIT - scanCount);
  const scansExhausted = scanCount >= FREE_SCAN_LIMIT;

  const scanBadge =
    !isPro ? (
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${
          scansExhausted ? "pricing-modal-badge pricing-modal-badge--danger" : "pricing-modal-badge"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${scansExhausted ? "bg-danger" : "bg-paper"}`}
        />
        {scansExhausted
          ? "All free scans used"
          : `${scansLeft} free scan${scansLeft === 1 ? "" : "s"} left on Free`}
      </div>
    ) : null;

  return (
    <div
      className="gp-modal-backdrop gp-pricing-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-ink/55 backdrop-blur-[10px] gp-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
      onClick={() => !billingLoading && onClose()}
    >
      <div className="flex min-h-full justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div
          className="relative my-auto w-full max-w-[min(calc(100vw-2rem),960px)] gp-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={billingLoading}
            aria-label="Close"
            className="pricing-modal-close absolute -top-1 right-0 z-10 grid h-9 w-9 place-items-center rounded-full border transition-colors disabled:opacity-50 sm:-top-2 sm:right-0"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="pricing-modal-content pt-2">
            <div id="pricing-modal-title" className="sr-only">
              Pricing
            </div>
            {mandateNotice ? (
              <div
                role="status"
                className="mx-auto mb-4 max-w-xl rounded-xl border border-line bg-surface-2/80 px-4 py-3 text-[12px] leading-relaxed text-muted"
              >
                {mandateNotice}
              </div>
            ) : null}
            <PricingSectionContent
              presentation="modal"
              checkoutMode
              billingLoading={billingLoading}
              showCurrentFreePlan
              onCheckoutMonthly={onSelectMonthly}
              onCheckoutYearly={onSelectYearly}
              headerExtra={scanBadge}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

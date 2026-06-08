"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { QueenMark } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/Spinner";
import { RazorpayTrustBar } from "@/components/ui/RazorpayLogo";
import { LegalLink } from "@/components/legal/PolicyFooter";
import { FREE_SCAN_LIMIT } from "@/components/dashboard/FreePlanUI";
import { storePendingUpgrade } from "@/lib/razorpayCheckout";
import { ProFeatureList } from "./ProFeatureList";
import {
  PRICING_CARD_BASE,
  PRICING_CARD_HIGHLIGHT,
  PRICING_CARD_MODAL_BASE,
  PRICING_CARD_MODAL_HIGHLIGHT,
  PRICING_HEADLINE,
  PRICING_SUBLINE,
  RAZORPAY_FOOTER_LINE,
  getFreeFeatures,
} from "./sharedPricing";

export interface PricingSectionContentProps {
  /** Landing section vs frameless modal overlay. */
  presentation?: "section" | "modal";
  /** Extra content below subtitle (e.g. scan badge in modal). */
  headerExtra?: React.ReactNode;
  /** Dashboard checkout — Pro buttons open Razorpay instead of linking to signup. */
  checkoutMode?: boolean;
  billingLoading?: boolean;
  onCheckoutMonthly?: () => void;
  onCheckoutYearly?: () => void;
  /** In checkout mode, show Free card as current plan. */
  showCurrentFreePlan?: boolean;
}

export function PricingSectionContent({
  presentation = "section",
  headerExtra,
  checkoutMode = false,
  billingLoading = false,
  onCheckoutMonthly,
  onCheckoutYearly,
  showCurrentFreePlan = false,
}: PricingSectionContentProps) {
  const freeFeatures = getFreeFeatures(FREE_SCAN_LIMIT);

  const isModal = presentation === "modal";
  const ctaMt = isModal ? "mt-5" : "mt-6";
  const priceMt = isModal ? "mt-5" : "mt-6";
  const listMt = isModal ? "mt-7" : "mt-8";
  const priceSize = isModal ? "text-[1.75rem]" : "text-[2rem]";
  const footerMt = isModal ? "mt-7 gap-3 pt-6" : "mt-10 gap-4 pt-8";
  const descSize = isModal ? "text-[13px]" : "text-[13px]";
  const titleSize = isModal ? "text-[15px]" : "text-[15px]";
  const featureSize = isModal ? "text-[13px]" : "text-[13px]";
  const featureGap = isModal ? "space-y-2.5" : "space-y-3";
  const featureIcon = isModal ? "h-4 w-4" : "h-4 w-4";
  const btnSize = isModal ? "btn-md" : "btn-md";

  const ctaClass = (variant: "primary" | "secondary", disabled = false) =>
    [
      variant === "primary" ? "btn-primary" : "btn-secondary",
      btnSize,
      "w-full",
      ctaMt,
      disabled ? "opacity-60" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const cardBase = isModal ? PRICING_CARD_MODAL_BASE : PRICING_CARD_BASE;
  const cardHighlight = isModal ? PRICING_CARD_MODAL_HIGHLIGHT : PRICING_CARD_HIGHLIGHT;
  const gridClass = isModal
    ? "-mx-1 mt-6 pb-2 md:mx-0 md:pb-0"
    : "-mx-1 mx-auto mt-10 w-full max-w-5xl gap-5 pb-2 sm:mt-12 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:pb-0";

  const renderPriceRow = (
    price: React.ReactNode,
    cta: React.ReactNode,
    subtext?: React.ReactNode,
  ) => (
    <>
      <div className={priceMt}>{price}</div>
      {subtext}
      {cta}
    </>
  );

  const priceBlock = (amount: string, suffix: string) => (
    <div className="flex items-baseline gap-1.5">
      <span className={`${priceSize} font-semibold tracking-tight text-ink`}>{amount}</span>
      <span className={`${descSize} text-muted`}>{suffix}</span>
    </div>
  );

  const proMonthlyCta = checkoutMode ? (
    <button
      type="button"
      disabled={billingLoading}
      aria-busy={billingLoading || undefined}
      onClick={onCheckoutMonthly}
      className={ctaClass("secondary")}
    >
      {billingLoading ? (
        <>
          <Spinner size={15} />
          Opening Razorpay…
        </>
      ) : (
        <>
          <QueenMark className="h-3 w-3" />
          Get started
        </>
      )}
    </button>
  ) : (
    <Link
      href="/signup"
      prefetch
      onClick={() => storePendingUpgrade("monthly")}
      className={ctaClass("secondary")}
    >
      <QueenMark className="h-3 w-3" />
      Get started
    </Link>
  );

  const proYearlyCta = checkoutMode ? (
    <button
      type="button"
      disabled={billingLoading}
      aria-busy={billingLoading || undefined}
      onClick={onCheckoutYearly}
      className={ctaClass("primary")}
    >
      {billingLoading ? (
        <>
          <Spinner size={15} />
          Opening Razorpay…
        </>
      ) : (
        <>
          <QueenMark className="h-3 w-3" />
          Get started
        </>
      )}
    </button>
  ) : (
    <Link
      href="/signup"
      prefetch
      onClick={() => storePendingUpgrade("yearly")}
      className={ctaClass("primary")}
    >
      <QueenMark className="h-3 w-3" />
      Get started
    </Link>
  );

  const freeCta =
    showCurrentFreePlan && checkoutMode ? (
      <button type="button" disabled className={ctaClass("secondary", true)}>
        Current plan
      </button>
    ) : (
      <Link href="/signup" prefetch className={ctaClass("secondary")}>
        Get started
      </Link>
    );

  return (
    <>
      <div
        className={`mx-auto max-w-2xl text-center ${isModal ? "pricing-modal-header" : ""}`}
      >
        <h2
          className={`font-semibold tracking-[-0.03em] ${
            isModal
              ? "text-[clamp(1.375rem,2.2vw,1.75rem)]"
              : "text-[clamp(1.75rem,3vw,2.25rem)] text-ink"
          }`}
        >
          {PRICING_HEADLINE}
        </h2>
        <p
          className={`leading-relaxed ${isModal ? "mt-2 text-[13px]" : "mt-3 text-[15px] text-muted"}`}
        >
          {PRICING_SUBLINE}
        </p>
        {headerExtra ? (
          <div className={`flex justify-center ${isModal ? "mt-3" : "mt-5"}`}>{headerExtra}</div>
        ) : null}
      </div>

      <div
        className={`landing-pricing-scroll flex snap-x snap-mandatory overflow-x-auto ${gridClass}`}
      >
        <article className={cardBase}>
          <h3 className={`${titleSize} font-medium text-ink`}>Free</h3>
          <p className={`mt-0.5 ${descSize} text-muted`}>Perfect for your next tournament round</p>
          {renderPriceRow(priceBlock("₹0", "forever"), freeCta)}
          <ul className={`${listMt} ${featureGap} flex-1`}>
            {freeFeatures.map((f) => (
              <li key={f} className={`flex items-start gap-2.5 ${featureSize} leading-snug text-muted`}>
                <Check className={`mt-0.5 ${featureIcon} shrink-0 text-muted-2`} strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
        </article>

        <article className={cardHighlight}>
          <span className="absolute right-4 top-4 rounded-full bg-ink px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-paper shadow-sm sm:right-5 sm:top-5 sm:px-2.5 sm:py-1 sm:text-[10px]">
            Popular
          </span>
          <h3 className={`${titleSize} font-medium text-ink`}>Pro · Yearly</h3>
          <p className={`mt-0.5 ${descSize} text-muted`}>Best value for serious tournament players</p>
          {renderPriceRow(
            priceBlock("₹1,000", "/ year"),
            proYearlyCta,
            <p className="mt-1 text-[12px] text-muted-2">
              ₹83/month · save 17% vs monthly
            </p>,
          )}
          <ProFeatureList className={`${listMt} flex-1`} compact={false} />
        </article>

        <article className={cardBase}>
          <h3 className={`${titleSize} font-medium text-ink`}>Pro · Monthly</h3>
          <p className={`mt-0.5 ${descSize} text-muted`}>For players who digitize every week</p>
          {renderPriceRow(priceBlock("₹100", "/ month"), proMonthlyCta)}
          <ProFeatureList className={`${listMt} flex-1`} compact={false} />
        </article>
      </div>

      <div
        className={`flex flex-col items-center border-t sm:flex-row sm:justify-between ${footerMt} ${
          isModal ? "pricing-modal-footer" : "border-line"
        }`}
      >
        <p
          className={`text-center text-[11px] sm:text-left sm:text-[12px] ${isModal ? "" : "text-muted-2"}`}
        >
          {RAZORPAY_FOOTER_LINE}
          {" "}
          ·{" "}
          <LegalLink href="/privacy" onDark={isModal}>
            Privacy
          </LegalLink>
          {" · "}
          <LegalLink href="/refund" onDark={isModal}>
            Refunds
          </LegalLink>
        </p>
        <RazorpayTrustBar dark={isModal} className={isModal ? "pb-1 text-white/55" : undefined} />
      </div>
    </>
  );
}

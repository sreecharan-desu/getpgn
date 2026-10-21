"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Minus } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { RazorpayTrustBar } from "@/components/ui/RazorpayLogo";
import { LegalLink } from "@/components/legal/PolicyFooter";
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
} from "./sharedPricing";
import { FREE_SCAN_LIMIT } from "@/components/dashboard/FreePlanUI";
import { PRICING_DISPLAY, formatInr } from "@/lib/pricingDisplay";

export interface PricingSectionContentProps {
  presentation?: "section" | "modal";
  headerExtra?: React.ReactNode;
  checkoutMode?: boolean;
  billingLoading?: boolean;
  onCheckoutMonthly?: () => void;
  onCheckoutYearly?: () => void;
  onCheckoutEnterprise?: () => void;
}

export function PricingSectionContent({
  presentation = "section",
  headerExtra,
  checkoutMode = false,
  billingLoading = false,
  onCheckoutMonthly,
}: PricingSectionContentProps) {
  const { monthly } = PRICING_DISPLAY;
  const showFreePlan = !checkoutMode;

  const isModal = presentation === "modal";
  const footerMt = isModal ? "mt-7 gap-3 pt-6" : "mt-10 gap-4 pt-8";
  const descSize = "text-[13px]";
  const titleSize = "text-[15px]";
  const priceSize = isModal ? "text-[1.75rem]" : "text-[2rem]";
  const featureSize = "text-[13px]";
  const featureGap = "space-y-3";
  const featureIcon = "h-4 w-4";
  const btnSize = "btn-md";

  const ctaClass = (variant: "primary" | "secondary", disabled = false) =>
    [
      variant === "primary" ? "btn-primary" : "btn-secondary",
      btnSize,
      "w-full",
      disabled ? "opacity-60" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const cardBase = isModal ? PRICING_CARD_MODAL_BASE : PRICING_CARD_BASE;
  const cardHighlight = isModal ? PRICING_CARD_MODAL_HIGHLIGHT : PRICING_CARD_HIGHLIGHT;
  const gridClass = isModal
    ? showFreePlan
      ? "-mx-1 mx-auto mt-6 w-full max-w-3xl items-stretch pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0"
      : "-mx-1 mx-auto mt-6 w-full max-w-md items-stretch gap-4 pb-2 md:mx-0 md:grid md:grid-cols-1 md:overflow-visible md:pb-0"
    : `-mx-1 mx-auto mt-10 w-full max-w-3xl items-stretch gap-5 pb-2 sm:mt-12 lg:grid lg:items-stretch lg:gap-5 lg:overflow-visible lg:pb-0 ${
        showFreePlan ? "lg:grid-cols-2" : "lg:grid-cols-1"
      }`;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const overflow = el.scrollWidth - el.clientWidth > 12;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 12;
      setShowScrollHint(overflow && !atEnd);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isModal]);

  const priceBlock = (
    amount: string,
    suffix: string,
    options?: { prefix?: string },
  ) => (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {options?.prefix ? (
        <span className={`${descSize} font-medium text-muted`}>{options.prefix}</span>
      ) : null}
      <span className={`${priceSize} font-semibold tracking-tight text-ink`}>{amount}</span>
      {suffix ? <span className={`${descSize} text-muted`}>{suffix}</span> : null}
    </div>
  );

  const renderCardShell = (
    className: string,
    {
      title,
      tagline,
      price,
      subtext,
      cta,
      features,
      badge,
      badgeVariant = "featured",
    }: {
      title: string;
      tagline: string;
      price: React.ReactNode;
      subtext: React.ReactNode;
      cta: React.ReactNode;
      features: React.ReactNode;
      badge?: React.ReactNode;
      badgeVariant?: "featured" | "subtle";
    },
  ) => (
    <article className={className}>
      {badge ? (
        <div
          className={
            badgeVariant === "featured"
              ? "pricing-card__badge-row"
              : "pricing-card__badge-row pricing-card__badge-row--subtle"
          }
        >
          {badge}
        </div>
      ) : null}
      <div className="pricing-card__intro">
        <h3 className={`${titleSize} font-medium text-ink`}>{title}</h3>
        <p className={`mt-0.5 ${descSize} text-muted`}>{tagline}</p>
      </div>
      <div className="pricing-card__price-block">
        {price}
        <div className="pricing-card__subtext">{subtext}</div>
      </div>
      <div className="pricing-card__cta">{cta}</div>
      <div className="pricing-card__features">{features}</div>
    </article>
  );

  const proMonthlyCta = checkoutMode ? (
    <button
      type="button"
      disabled={billingLoading}
      aria-busy={billingLoading || undefined}
      onClick={onCheckoutMonthly}
      className={ctaClass("secondary", billingLoading)}
    >
      {billingLoading ? (
        <>
          <Spinner size={15} />
          Opening Razorpay…
        </>
      ) : (
        "Get started"
      )}
    </button>
  ) : (
    <Link
      href="/signup"
      prefetch
      onClick={() => storePendingUpgrade("monthly")}
      className={ctaClass("secondary")}
    >
      Get started
    </Link>
  );

  const freeCta = (
    <Link href="/signup" prefetch className={ctaClass("secondary")}>
      Start free
    </Link>
  );

  const freeFeatures = [
    `${FREE_SCAN_LIMIT} lifetime scoresheet scans`,
    "Move validation & session PGN export",
    "No cloud library or share links",
  ] as const;

  const featureList = (
    items: readonly string[],
    options?: { excluded?: readonly string[] },
  ) => {
    const excluded = new Set(options?.excluded ?? []);
    return (
      <ul className={`${featureGap}`}>
        {items.map((f) => {
          const isExcluded = excluded.has(f);
          return (
            <li
              key={f}
              className={`flex items-start gap-2.5 ${featureSize} leading-snug ${
                isExcluded ? "text-muted-2" : "text-muted"
              }`}
            >
              {isExcluded ? (
                <Minus
                  className={`mt-0.5 ${featureIcon} shrink-0 text-muted-2/80`}
                  strokeWidth={2.5}
                />
              ) : (
                <Check
                  className={`mt-0.5 ${featureIcon} shrink-0 text-muted-2`}
                  strokeWidth={2.5}
                />
              )}
              {f}
            </li>
          );
        })}
      </ul>
    );
  };

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
          <div className={`flex justify-center ${isModal ? "mt-3" : "mt-5"}`}>
            {headerExtra}
          </div>
        ) : null}
      </div>

      <div className="relative md:contents">
        <p
          className={`mb-2 flex items-center justify-center gap-1.5 text-[12px] md:hidden ${
            isModal ? "pricing-modal-scroll-hint" : "text-muted"
          }`}
          aria-hidden="true"
        >
          Swipe to compare plans
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </p>

        {showScrollHint ? (
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 md:hidden ${
              isModal ? "pricing-scroll-fade--modal" : "pricing-scroll-fade--light"
            }`}
            aria-hidden="true"
          />
        ) : null}

        <div
          ref={scrollRef}
          className={`landing-pricing-scroll flex snap-x snap-mandatory overflow-x-auto ${gridClass}`}
        >
          {showFreePlan
            ? renderCardShell(cardBase, {
                title: "Free",
                tagline: "Try the full digitizing flow",
                price: priceBlock(formatInr(0), ""),
                subtext: "Free plan features only",
                cta: freeCta,
                features: featureList(freeFeatures, {
                  excluded: ["No cloud library or share links"],
                }),
              })
            : null}

          {renderCardShell(cardHighlight, {
            title: "Pro · Monthly",
            tagline: "For players who digitize every week",
            price: priceBlock(formatInr(monthly.priceInr), "/ month"),
            subtext: "Billed monthly · cancel anytime",
            cta: proMonthlyCta,
            features: <ProFeatureList compact={false} />,
          })}

        </div>
      </div>

      <div
        className={`flex flex-col items-center border-t sm:flex-row sm:justify-between ${footerMt} ${
          isModal ? "pricing-modal-footer" : "border-line"
        }`}
      >
        <p
          className={`text-center text-[11px] sm:text-left sm:text-[12px] ${isModal ? "" : "text-muted-2"}`}
        >
          {RAZORPAY_FOOTER_LINE} ·{" "}
          <LegalLink href="/privacy" onDark={isModal}>
            Privacy
          </LegalLink>
          {" · "}
          <LegalLink href="/terms" onDark={isModal}>
            Terms
          </LegalLink>
          {" · "}
          <LegalLink href="/refund" onDark={isModal}>
            Refunds
          </LegalLink>
        </p>
        <RazorpayTrustBar
          dark={isModal}
          className={isModal ? "pb-1 text-white/55" : undefined}
        />
      </div>
    </>
  );
}

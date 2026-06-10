export const PRO_CORE_FEATURES = [
  "₹100/month · 100 scans/month",
  "₹1,000/year · 1,000 scans/year",
  "Cloud library & board previews",
  "Shareable interactive replays",
  "PGN export anytime",
  "Priority validation",
] as const;

export const PRO_PREMIUM_FEATURES = [
  "5 board color themes",
  "Permanent game history",
] as const;

export const PRICING_HEADLINE = "Simple, transparent pricing";
export const PRICING_SUBLINE =
  "Choose a plan that works for you. No hidden fees — cancel Pro anytime.";

export const RAZORPAY_FOOTER_LINE =
  "Pay with credit card or PhonePe · Secure Razorpay checkout · Cancel anytime";

export const PRICING_CARD_BASE =
  "pricing-card pricing-card-layout flex h-full w-full min-w-[min(100%,280px)] flex-shrink-0 snap-center flex-col p-6 sm:p-8 lg:min-w-0";

export const PRICING_CARD_HIGHLIGHT =
  "pricing-card pricing-card--featured pricing-card-layout relative flex h-full w-full min-w-[min(100%,280px)] flex-shrink-0 snap-center flex-col p-6 sm:p-8 lg:min-w-0";

/** Narrow snap targets + tall equal columns in the dashboard modal. */
export const PRICING_CARD_MODAL_BASE =
  "pricing-card pricing-card--modal pricing-card-layout flex h-full w-full min-w-[min(82vw,300px)] flex-shrink-0 snap-center flex-col p-6 sm:p-8 md:min-w-0";

export const PRICING_CARD_MODAL_HIGHLIGHT =
  "pricing-card pricing-card--featured pricing-card--modal pricing-card-layout relative flex h-full w-full min-w-[min(82vw,300px)] flex-shrink-0 snap-center flex-col p-6 sm:p-8 md:min-w-0";

export function getFreeFeatures(scanLimit: number) {
  return [
    `${scanLimit} scoresheet scans`,
    "AI move extraction",
    "Live board validation",
    "PGN copy & download",
    "Inline move editing",
  ] as const;
}

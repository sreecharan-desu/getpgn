import React from "react";

/** Razorpay brand mark — blue R + optional wordmark. */
export function RazorpayLogo({
  className = "",
  showWordmark = true,
  wordmarkClassName = "text-sm font-semibold text-ink",
}: {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-label="Razorpay" role="img">
        <path
          fill="#3395FF"
          d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24l9.008-5.821z"
        />
      </svg>
      {showWordmark && <span className={wordmarkClassName}>Razorpay</span>}
    </span>
  );
}

export function RazorpayTrustBar({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] ${
        dark ? "text-neutral-500" : "text-muted-2"
      } ${className}`}
    >
      <span className="inline-flex items-center gap-2">
        <RazorpayLogo showWordmark wordmarkClassName={`text-[12px] font-semibold ${dark ? "text-neutral-400" : "text-muted"}`} />
      </span>
      <span>256-bit secure checkout</span>
      <span>Instant Pro activation</span>
      <span>Cancel anytime</span>
    </div>
  );
}

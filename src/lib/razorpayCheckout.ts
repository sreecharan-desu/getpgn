import { friendlyError } from '@/lib/friendlyError';
import { mapRazorpayPaymentFailure } from '@/lib/mapRazorpayPaymentFailure';
import { PRICING_DISPLAY } from '@/lib/pricingDisplay';

export type BillingPlan = "monthly" | "yearly" | "enterprise";

export function formatBillingDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" });
}

/** Razorpay checkout subtitle when billing is deferred to period end. */
export function getDeferredCheckoutDescription(
  plan: BillingPlan,
  billingStartsAt: string,
): string {
  const date = formatBillingDate(billingStartsAt);
  const planAmount = plan === "monthly" ? "₹100" : "₹1,000";
  const cycle = plan === "monthly" ? "month" : "year";
  return `₹1 mandate today only · ${planAmount}/${cycle} auto-debits on ${date}`;
}

/** Banner copy before deferred resubscribe checkout. */
export function getDeferredMandateNotice(billingStartsAt: string): string {
  const date = formatBillingDate(billingStartsAt);
  return `You're only setting up autopay today (₹1 mandate). Your plan payment will be automatically deducted on ${date} — not before.`;
}

/**
 * Subscription checkout — Razorpay's native UPI panel (apps + QR) and cards.
 * Custom UPI blocks with show_default_blocks:false render a broken empty panel;
 * hide unwanted methods instead of replacing the whole UPI UI.
 */
export const RAZORPAY_SUBSCRIPTION_CHECKOUT_CONFIG = {
  display: {
    hide: [
      { method: "card", types: ["debit"] },
      { method: "netbanking" },
      { method: "wallet" },
      { method: "emi" },
      { method: "paylater" },
    ],
    sequence: ["upi", "card"],
    preferences: {
      show_default_blocks: true,
    },
  },
} as const;

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: unknown) => RazorpayCheckoutInstance;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function storePendingUpgrade(plan: BillingPlan) {
  try {
    sessionStorage.setItem("getpgn:pending-upgrade", plan);
  } catch {
    /* ignore */
  }
}

export function consumePendingUpgrade(): BillingPlan | null {
  try {
    const plan = sessionStorage.getItem("getpgn:pending-upgrade");
    sessionStorage.removeItem("getpgn:pending-upgrade");
    if (plan === "monthly" || plan === "yearly" || plan === "enterprise") return plan;
  } catch {
    /* ignore */
  }
  return null;
}

interface OpenCheckoutOptions {
  plan: BillingPlan;
  username?: string;
  onVerified: (payload: {
    plan: BillingPlan;
    subscriptionId: string;
    deferredBilling?: boolean;
    subscriptionStatus?: string;
    subscriptionStart?: string | null;
    subscriptionEnd?: string | null;
  }) => void | Promise<void>;
  onError: (message: string) => void;
}

export async function openRazorpayCheckout({
  plan,
  username,
  onVerified,
  onError,
}: OpenCheckoutOptions): Promise<void> {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    onError("Checkout couldn't load. Check your connection and try again.");
    return;
  }

  const res = await fetch("/api/subscription/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    onError(friendlyError(data.error, "We couldn't start checkout. Please try again."));
    return;
  }

  const data = (await res.json()) as {
    keyId: string;
    subscription_id: string;
    username?: string;
    email?: string;
    deferredBilling?: boolean;
    billingStartsAt?: string | null;
  };

  const deferredCheckout =
    data.deferredBilling && data.billingStartsAt
      ? getDeferredCheckoutDescription(plan, data.billingStartsAt)
      : null;

  const options = {
    key: data.keyId,
    subscription_id: data.subscription_id,
    name:
      plan === "monthly"
        ? "GetPGN Pro Monthly"
        : plan === "yearly"
          ? "GetPGN Pro Yearly"
          : "GetPGN Enterprise",
    description:
      deferredCheckout ??
      (plan === "monthly"
        ? "₹100/month · cancel anytime"
        : plan === "yearly"
          ? "₹1,000/year · save 17%"
          : `₹${PRICING_DISPLAY.enterprise.priceInr.toLocaleString('en-IN')}/year · ${PRICING_DISPLAY.enterprise.scanLimit.toLocaleString('en-IN')} scans · organizer library`),
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    }) => {
      try {
        const verifyRes = await fetch("/api/subscription/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
            plan,
          }),
        });

        if (!verifyRes.ok) {
          const errData = (await verifyRes.json().catch(() => ({}))) as { error?: string };
          onError(
            friendlyError(
              errData.error,
              "Payment received but we couldn't confirm it. Contact support if you were charged.",
            ),
          );
          return;
        }

        const verifyData = (await verifyRes.json()) as {
          deferredBilling?: boolean;
          user?: {
            subscriptionStatus?: string;
            subscriptionStart?: string | null;
            subscriptionEnd?: string | null;
          };
        };

        await onVerified({
          plan,
          subscriptionId: response.razorpay_subscription_id,
          deferredBilling: verifyData.deferredBilling,
          subscriptionStatus: verifyData.user?.subscriptionStatus,
          subscriptionStart: verifyData.user?.subscriptionStart,
          subscriptionEnd: verifyData.user?.subscriptionEnd,
        });
      } catch {
        onError("We couldn't confirm your payment. Please try again.");
      }
    },
    prefill: {
      ...(username || data.username ? { name: username ?? data.username } : {}),
      ...(data.email ? { email: data.email } : {}),
    },
    theme: { color: "#0a0a0a" },
    config: RAZORPAY_SUBSCRIPTION_CHECKOUT_CONFIG,
  };

  const rzp = new window.Razorpay!(options);
  rzp.on("payment.failed", (raw) => {
    const response = raw as {
      error?: {
        description?: string;
        reason?: string;
        source?: string;
        step?: string;
      };
    };
    onError(mapRazorpayPaymentFailure(response.error ?? {}));
  });
  rzp.open();
}

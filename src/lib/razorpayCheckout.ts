export type BillingPlan = "monthly" | "yearly";

declare global {
  interface Window {
    Razorpay?: new (options: unknown) => { open: () => void };
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
    if (plan === "monthly" || plan === "yearly") return plan;
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
    onError("Razorpay failed to load. Check your connection and try again.");
    return;
  }

  const res = await fetch("/api/subscription/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    onError(data.error ?? "We couldn't start checkout. Please try again.");
    return;
  }

  const data = (await res.json()) as { keyId: string; subscription_id: string };

  const options = {
    key: data.keyId,
    subscription_id: data.subscription_id,
    name: plan === "monthly" ? "GetPGN Pro Monthly" : "GetPGN Pro Yearly",
    description:
      plan === "monthly" ? "₹100/month · cancel anytime" : "₹1,000/year · save 17%",
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
          onError(errData.error ?? "Payment received but verification failed. Contact support if charged.");
          return;
        }

        await onVerified({
          plan,
          subscriptionId: response.razorpay_subscription_id,
        });
      } catch {
        onError("We couldn't confirm your payment. Please try again.");
      }
    },
    prefill: username ? { name: username } : undefined,
    theme: { color: "#0a0a0a" },
  };

  const rzp = new window.Razorpay!(options);
  rzp.open();
}

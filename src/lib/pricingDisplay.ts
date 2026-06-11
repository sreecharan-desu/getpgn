/** Client-safe plan display values — override via NEXT_PUBLIC_* env at build time. */

function publicInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const PRICING_DISPLAY = {
  monthly: {
    priceInr: publicInt('NEXT_PUBLIC_PLAN_MONTHLY_PRICE_INR', 100),
    scanLimit: publicInt('NEXT_PUBLIC_PLAN_MONTHLY_SCAN_LIMIT', 100),
  },
  yearly: {
    priceInr: publicInt('NEXT_PUBLIC_PLAN_YEARLY_PRICE_INR', 1000),
    scanLimit: publicInt('NEXT_PUBLIC_PLAN_YEARLY_SCAN_LIMIT', 1000),
  },
  enterprise: {
    priceInr: publicInt('NEXT_PUBLIC_PLAN_ENTERPRISE_PRICE_INR', 4000),
    scanLimit: publicInt('NEXT_PUBLIC_PLAN_ENTERPRISE_SCAN_LIMIT', 1000),
  },
} as const;

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Subscription plan catalog — customize pricing and scan limits via env vars
 * without code changes. Restart the server after updating env.
 */

export type CatalogPlanId = 'monthly' | 'yearly' | 'enterprise';

export type CatalogPlan = {
  id: CatalogPlanId;
  displayName: string;
  priceInr: number;
  pricePaise: number;
  scanLimit: number;
  period: 'monthly' | 'yearly';
  razorpayEnvKey: string;
  description: string;
  featured?: boolean;
};

function envInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function envStr(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v || fallback;
}

/** Central plan definitions — override any value with env vars. */
export function getPlanCatalog(): Record<CatalogPlanId, CatalogPlan> {
  const monthlyPrice = envInt('PLAN_MONTHLY_PRICE_INR', 100);
  const yearlyPrice = envInt('PLAN_YEARLY_PRICE_INR', 1000);
  const enterprisePrice = envInt('PLAN_ENTERPRISE_PRICE_INR', 4000);

  const monthlyScans = envInt('PLAN_MONTHLY_SCAN_LIMIT', 100);
  const yearlyScans = envInt('PLAN_YEARLY_SCAN_LIMIT', 1000);
  const enterpriseScans = envInt('PLAN_ENTERPRISE_SCAN_LIMIT', 1000);

  return {
    monthly: {
      id: 'monthly',
      displayName: envStr('PLAN_MONTHLY_NAME', 'Pro Monthly'),
      priceInr: monthlyPrice,
      pricePaise: monthlyPrice * 100,
      scanLimit: monthlyScans,
      period: 'monthly',
      razorpayEnvKey: 'RAZORPAY_MONTHLY_PLAN_ID',
      description: `₹${monthlyPrice}/month · ${monthlyScans} scans/month`,
    },
    yearly: {
      id: 'yearly',
      displayName: envStr('PLAN_YEARLY_NAME', 'Pro Yearly'),
      priceInr: yearlyPrice,
      pricePaise: yearlyPrice * 100,
      scanLimit: yearlyScans,
      period: 'yearly',
      razorpayEnvKey: 'RAZORPAY_YEARLY_PLAN_ID',
      description: `₹${yearlyPrice}/year · ${yearlyScans.toLocaleString()} scans/year`,
      featured: true,
    },
    enterprise: {
      id: 'enterprise',
      displayName: envStr('PLAN_ENTERPRISE_NAME', 'Enterprise'),
      priceInr: enterprisePrice,
      pricePaise: enterprisePrice * 100,
      scanLimit: enterpriseScans,
      period: 'yearly',
      razorpayEnvKey: 'RAZORPAY_ENTERPRISE_PLAN_ID',
      description: `₹${enterprisePrice.toLocaleString()} · ${enterpriseScans.toLocaleString()} scans · organizer library`,
    },
  };
}

export function getCatalogPlan(planId: CatalogPlanId): CatalogPlan {
  return getPlanCatalog()[planId];
}

export function isEnterprisePlan(
  subscriptionPlan: string | null | undefined,
  plan?: string | null,
): boolean {
  return subscriptionPlan === 'enterprise' || plan === 'ENTERPRISE';
}

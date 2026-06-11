import { getCatalogPlan, isEnterprisePlan } from '@/lib/planCatalog';

export function getSubscriptionPlanShort(
  subscriptionPlan: string | null | undefined,
  plan?: string | null,
): string {
  if (isEnterprisePlan(subscriptionPlan, plan)) return 'Enterprise';
  if (subscriptionPlan === 'yearly') return 'Pro Yearly';
  if (subscriptionPlan === 'monthly') return 'Pro Monthly';
  return 'Pro';
}

export function getSubscriptionBillingLabel(
  subscriptionPlan: string | null | undefined,
  plan?: string | null,
  opts?: { simulated?: boolean },
): string {
  const sim = opts?.simulated ? ' — Dev simulation' : '';
  if (isEnterprisePlan(subscriptionPlan, plan)) {
    return `GetPGN Enterprise${sim}`;
  }
  if (subscriptionPlan === 'yearly') {
    return `GetPGN Pro — Yearly${sim}`;
  }
  return `GetPGN Pro — Monthly${sim}`;
}

export function getSubscriptionAmount(
  subscriptionPlan: string | null | undefined,
  plan?: string | null,
  simulated?: boolean,
): string {
  if (simulated) return '—';
  if (isEnterprisePlan(subscriptionPlan, plan)) {
    return `₹${getCatalogPlan('enterprise').priceInr.toLocaleString('en-IN')}`;
  }
  if (subscriptionPlan === 'yearly') return '₹1,000';
  return '₹100';
}

export function getSubscriptionCycleLabel(
  subscriptionPlan: string | null | undefined,
  plan?: string | null,
): string {
  if (isEnterprisePlan(subscriptionPlan, plan)) return 'Yearly';
  if (subscriptionPlan === 'yearly') return 'Yearly';
  return 'Monthly';
}

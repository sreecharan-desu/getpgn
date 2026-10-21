import { getRecommendedPlan, type UserRole } from '@/lib/userRoles';
import { PRICING_DISPLAY, formatInr } from '@/lib/pricingDisplay';

export const ONBOARDING_PLAN_IDS = ['free', 'monthly', 'yearly', 'organizer'] as const;

export type OnboardingPlanId = (typeof ONBOARDING_PLAN_IDS)[number];

export function isOnboardingPlanId(value: string): value is OnboardingPlanId {
  return (ONBOARDING_PLAN_IDS as readonly string[]).includes(value);
}

/** Suggested plan from onboarding role — enterprise maps to organizer checkout. */
export function defaultPlanForRole(role: UserRole): OnboardingPlanId {
  // only the monthly (₹100) plan is sold right now
  return getRecommendedPlan(role) === 'free' ? 'free' : 'monthly';
}

const { monthly } = PRICING_DISPLAY;

export type OnboardingPlanCard = {
  id: OnboardingPlanId;
  title: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  features: readonly string[];
  recommended?: boolean;
  cta: string;
};

export const ONBOARDING_PLAN_CARDS: readonly OnboardingPlanCard[] = [
  {
    id: 'free',
    title: 'Free',
    price: formatInr(0),
    tagline: 'Try GetPGN with core features',
    features: [
      '2 lifetime scoresheet scans',
      'Move validation & session PGN export',
      'No cloud library or share links',
    ],
    cta: 'Continue with Free',
  },
  {
    id: 'monthly',
    title: 'Pro Monthly',
    price: formatInr(monthly.priceInr),
    priceSuffix: '/month',
    tagline: `${monthly.scanLimit} scans every month`,
    features: [
      `${monthly.scanLimit} scans per month`,
      'Cloud library & shareable replays',
      'Board themes & priority validation',
    ],
    cta: 'Subscribe monthly',
  },
] as const;

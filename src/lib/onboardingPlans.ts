import { getRecommendedPlan, type UserRole } from '@/lib/userRoles';
import { PRICING_DISPLAY, formatInr } from '@/lib/pricingDisplay';
import {
  ORGANIZER_MIN_SCANS,
  ORGANIZER_PRICE_PER_SCAN_INR,
  formatOrganizerInr,
} from '@/lib/organizerPricing';

export const ONBOARDING_PLAN_IDS = ['free', 'monthly', 'yearly', 'organizer'] as const;

export type OnboardingPlanId = (typeof ONBOARDING_PLAN_IDS)[number];

export function isOnboardingPlanId(value: string): value is OnboardingPlanId {
  return (ONBOARDING_PLAN_IDS as readonly string[]).includes(value);
}

/** Suggested plan from onboarding role — enterprise maps to organizer checkout. */
export function defaultPlanForRole(role: UserRole): OnboardingPlanId {
  const recommended = getRecommendedPlan(role);
  if (recommended === 'enterprise') return 'organizer';
  return recommended;
}

const { monthly, yearly } = PRICING_DISPLAY;
const organizerBaseInr = ORGANIZER_MIN_SCANS * ORGANIZER_PRICE_PER_SCAN_INR;

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
  {
    id: 'organizer',
    title: 'Prepaid scans',
    price: formatOrganizerInr(organizerBaseInr),
    priceSuffix: ' base pack',
    tagline: 'Pay-as-you-go — no subscription required',
    features: [
      `From ${ORGANIZER_MIN_SCANS.toLocaleString('en-IN')} scans per pack`,
      'Top up anytime when you need more',
      'Or use alongside Pro monthly / yearly',
    ],
    recommended: true,
    cta: 'Buy scan credits',
  },
  {
    id: 'yearly',
    title: 'Pro Yearly',
    price: formatInr(yearly.priceInr),
    priceSuffix: '/year',
    tagline: `${yearly.scanLimit.toLocaleString('en-IN')} scans per year`,
    features: [
      `${yearly.scanLimit.toLocaleString('en-IN')} scans per year`,
      'Everything in Pro Monthly',
      'Best value for regular players',
    ],
    cta: 'Subscribe yearly',
  },
] as const;

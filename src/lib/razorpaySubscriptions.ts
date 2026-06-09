import type Razorpay from 'razorpay';

export type BillingPlanType = 'monthly' | 'yearly';

/** Expected Razorpay plan shape for GetPGN Pro (amounts in paise). */
export const PLAN_SPECS: Record<
  BillingPlanType,
  {
    period: 'monthly' | 'yearly';
    interval: number;
    amountPaise: number;
    currency: 'INR';
    name: string;
    description: string;
    /** Billing cycles — bounds subscription length (Razorpay max ~100 years). */
    totalCount: number;
  }
> = {
  monthly: {
    period: 'monthly',
    interval: 1,
    amountPaise: 10_000, // ₹100
    currency: 'INR',
    name: 'GetPGN Pro Monthly',
    description: '₹100/month · 100 scans/month',
    totalCount: 120, // 10 years of monthly billing
  },
  yearly: {
    period: 'yearly',
    interval: 1,
    amountPaise: 100_000, // ₹1,000
    currency: 'INR',
    name: 'GetPGN Pro Yearly',
    description: '₹1,000/year · 1,200 scans/year',
    totalCount: 10, // 10 years
  },
};

/** How long the customer has to complete mandate authorisation at checkout. */
export const SUBSCRIPTION_AUTH_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

/** Reject reusing a pending sub when expire_by is within this many seconds. */
export const SUBSCRIPTION_AUTH_MIN_REMAINING_SECONDS = 10 * 60; // 10 minutes

type RazorpayPlanEntity = {
  id: string;
  period?: string;
  interval?: number;
  item?: {
    active?: boolean;
    amount?: number;
    currency?: string;
    name?: string;
  };
};

export class RazorpayPlanConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RazorpayPlanConfigError';
  }
}

export function isValidPlanId(planId: string): boolean {
  return /^plan_[A-Za-z0-9]{14}$/.test(planId);
}

export async function fetchAndValidatePlan(
  razorpay: Razorpay,
  planId: string,
  planType: BillingPlanType,
): Promise<RazorpayPlanEntity> {
  if (!isValidPlanId(planId)) {
    throw new RazorpayPlanConfigError(
      `Plan id "${planId}" is not a valid Razorpay plan id (expected plan_ + 14 characters).`,
    );
  }

  let plan: RazorpayPlanEntity;
  try {
    plan = (await razorpay.plans.fetch(planId)) as RazorpayPlanEntity;
  } catch {
    throw new RazorpayPlanConfigError(
      `Plan "${planId}" was not found in this Razorpay account/mode.`,
    );
  }

  const spec = PLAN_SPECS[planType];

  if (!plan.period || plan.interval == null) {
    throw new RazorpayPlanConfigError(
      `Plan "${planId}" has no billing period or interval. Create a subscription plan with period="${spec.period}" and interval=${spec.interval} (Dashboard → Subscriptions → Plans, or run scripts/razorpay-setup-plans.mjs).`,
    );
  }

  if (plan.period !== spec.period || plan.interval !== spec.interval) {
    throw new RazorpayPlanConfigError(
      `Plan "${planId}" is ${plan.period}/${plan.interval} but ${planType} checkout expects ${spec.period}/${spec.interval}. Update RAZORPAY_${planType.toUpperCase()}_PLAN_ID.`,
    );
  }

  if (plan.item?.active === false) {
    throw new RazorpayPlanConfigError(`Plan "${planId}" is inactive in Razorpay.`);
  }

  if (plan.item?.currency && plan.item.currency !== spec.currency) {
    throw new RazorpayPlanConfigError(
      `Plan "${planId}" currency is ${plan.item.currency}; expected ${spec.currency}.`,
    );
  }

  if (plan.item?.amount != null && plan.item.amount !== spec.amountPaise) {
    console.warn(
      `[Razorpay] Plan "${planId}" amount is ${plan.item.amount} paise; expected ${spec.amountPaise} for ${planType}.`,
    );
  }

  return plan;
}

export function buildSubscriptionCreatePayload(input: {
  planId: string;
  planType: BillingPlanType;
  userId: string;
  userEmail?: string | null;
  now?: Date;
}) {
  const { planId, planType, userId, userEmail, now = new Date() } = input;
  const spec = PLAN_SPECS[planType];
  const nowSec = Math.floor(now.getTime() / 1000);
  const expireBy = nowSec + SUBSCRIPTION_AUTH_EXPIRY_SECONDS;

  // Do NOT set start_at — Razorpay starts billing immediately after successful auth.
  // Setting start_at in the future wrongly shifts "Next Due" (e.g. +24h) before payment.
  // expire_by bounds how long the customer has to finish mandate authorisation at checkout.
  return {
    plan_id: planId,
    total_count: spec.totalCount,
    quantity: 1,
    customer_notify: true as const,
    expire_by: expireBy,
    notes: {
      userId,
      planType,
      ...(userEmail ? { userEmail } : {}),
    },
  };
}

type RazorpaySubscriptionEntity = {
  id: string;
  plan_id?: string;
  status?: string;
  total_count?: number | null;
  start_at?: number | null;
  end_at?: number | null;
  expire_by?: number | null;
  charge_at?: number | null;
  remaining_count?: number | null;
};

export function assertSubscriptionBounded(
  subscription: RazorpaySubscriptionEntity,
  planType: BillingPlanType,
): void {
  const spec = PLAN_SPECS[planType];

  if (subscription.total_count == null || subscription.total_count < 1) {
    throw new RazorpayPlanConfigError(
      `Razorpay created subscription "${subscription.id}" without total_count. The linked plan likely has no billing cycle — recreate the plan with period and interval.`,
    );
  }

  if (subscription.expire_by == null) {
    throw new RazorpayPlanConfigError(
      `Razorpay created subscription "${subscription.id}" without expire_by. Mandate authorisation window is missing — check create payload.`,
    );
  }

  if (subscription.total_count !== spec.totalCount) {
    console.warn(
      `[Razorpay] Subscription ${subscription.id} total_count=${subscription.total_count}, expected ${spec.totalCount}.`,
    );
  }

  // end_at is populated after authentication; null on status=created is expected without start_at.
  if (subscription.end_at == null && subscription.status !== 'created') {
    console.warn(
      `[Razorpay] Subscription ${subscription.id} has no end_at (status=${subscription.status}).`,
    );
  }
}

type RazorpaySubscriptionsList = {
  items?: RazorpaySubscriptionEntity[];
};

/** True when the customer can still complete mandate authorisation at checkout. */
export function canCompleteSubscriptionAuth(
  subscription: Pick<RazorpaySubscriptionEntity, 'status' | 'start_at' | 'expire_by'>,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (subscription.status !== 'created') return false;
  if (subscription.expire_by == null) return false;
  if (subscription.expire_by <= nowSec + SUBSCRIPTION_AUTH_MIN_REMAINING_SECONDS) return false;
  // Legacy subs created with a future start_at: auth must finish before start_at.
  if (
    subscription.start_at != null &&
    subscription.start_at <= nowSec + SUBSCRIPTION_AUTH_MIN_REMAINING_SECONDS
  ) {
    return false;
  }
  return true;
}

/** Reuse an open checkout subscription instead of creating duplicates on retry. */
export async function findReusablePendingSubscription(
  razorpay: Razorpay,
  userId: string,
  planType: BillingPlanType,
  planId: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<RazorpaySubscriptionEntity | null> {
  try {
    const list = (await razorpay.subscriptions.all({ count: 100 })) as unknown as RazorpaySubscriptionsList;
    const match = (list.items ?? []).find((sub) => {
      const notes = (sub as { notes?: Record<string, string> }).notes;
      return (
        sub.plan_id === planId &&
        notes?.userId === userId &&
        notes?.planType === planType &&
        canCompleteSubscriptionAuth(sub, nowSec)
      );
    });
    return match ?? null;
  } catch (error) {
    console.warn('[Razorpay] Could not list subscriptions for reuse:', error);
    return null;
  }
}

export function getPlanCreatePayload(planType: BillingPlanType) {
  const spec = PLAN_SPECS[planType];
  return {
    period: spec.period,
    interval: spec.interval,
    item: {
      name: spec.name,
      amount: spec.amountPaise,
      currency: spec.currency,
      description: spec.description,
    },
    notes: {
      product: 'getpgn-pro',
      planType,
    },
  };
}

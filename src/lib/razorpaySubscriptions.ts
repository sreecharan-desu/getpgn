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
  const expireBy =
    Math.floor(now.getTime() / 1000) + SUBSCRIPTION_AUTH_EXPIRY_SECONDS;

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
  end_at?: number | null;
  expire_by?: number | null;
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

  if (subscription.total_count !== spec.totalCount) {
    console.warn(
      `[Razorpay] Subscription ${subscription.id} total_count=${subscription.total_count}, expected ${spec.totalCount}.`,
    );
  }

  if (subscription.end_at == null) {
    console.warn(
      `[Razorpay] Subscription ${subscription.id} has no end_at yet (status=${subscription.status}). This can be normal before authentication; Razorpay derives end_at from plan period × total_count.`,
    );
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

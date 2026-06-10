import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import {
  createRazorpayClient,
  getRazorpayPlanId,
  logRazorpayDiagnostics,
  mapRazorpayError,
  PLAN_UNAVAILABLE,
  readRazorpayConfig,
} from '@/lib/razorpayServer';
import {
  assertSubscriptionBounded,
  buildSubscriptionCreatePayload,
  canCompleteSubscriptionAuth,
  fetchAndValidatePlan,
  findReusablePendingSubscription,
  getDeferredBillingStart,
  RazorpayPlanConfigError,
  type BillingPlanType,
} from '@/lib/razorpaySubscriptions';

export async function POST(req: NextRequest) {
  let planType: BillingPlanType = 'monthly';

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    try {
      const body = await req.json();
      if (body?.plan === 'yearly') planType = 'yearly';
      else if (body?.plan === 'monthly') planType = 'monthly';
    } catch {
      // default monthly
    }

    const planId = getRazorpayPlanId(planType);
    if (!planId) {
      logRazorpayDiagnostics(planType, 'plan_id_missing');
      return NextResponse.json({ error: PLAN_UNAVAILABLE }, { status: 503 });
    }

    const razorpayEnv = readRazorpayConfig();
    if (!razorpayEnv.ok) {
      return NextResponse.json({ error: razorpayEnv.error }, { status: 503 });
    }

    const { config } = razorpayEnv;
    const razorpay = createRazorpayClient(config);

    await fetchAndValidatePlan(razorpay, planId, planType);

    const billingStartsAt = getDeferredBillingStart(user);
    const expectedStartAtSec = billingStartsAt
      ? Math.floor(billingStartsAt.getTime() / 1000)
      : null;

    const reusable = await findReusablePendingSubscription(
      razorpay,
      user.id,
      planType,
      planId,
      expectedStartAtSec,
    );

    let subscription;
    const payload = buildSubscriptionCreatePayload({
      planId,
      planType,
      userId: user.id,
      userEmail: user.email,
      billingStartsAt,
    });

    if (reusable?.id) {
      const fetched = await razorpay.subscriptions.fetch(reusable.id);
      if (canCompleteSubscriptionAuth(fetched)) {
        console.log('[Razorpay] Reusing pending subscription:', {
          id: fetched.id,
          planType,
          userId: user.id,
          start_at: fetched.start_at,
          expire_by: fetched.expire_by,
        });
        subscription = fetched;
      } else {
        console.log('[Razorpay] Stale pending subscription skipped (auth window expired):', {
          id: reusable.id,
          expire_by: fetched.expire_by,
          start_at: fetched.start_at,
        });
        subscription = await razorpay.subscriptions.create(payload);
      }
    } else {
      console.log('[Razorpay] Creating subscription:', {
        planType,
        planId,
        total_count: payload.total_count,
      expire_by: payload.expire_by,
        userId: user.id,
      });
      subscription = await razorpay.subscriptions.create(payload);
    }

    if (!canCompleteSubscriptionAuth(subscription)) {
      console.warn('[Razorpay] Subscription not auth-ready; creating fresh:', {
        id: subscription.id,
        start_at: subscription.start_at,
      });
      subscription = await razorpay.subscriptions.create(payload);
    }

    assertSubscriptionBounded(
      subscription as {
        id: string;
        total_count?: number | null;
        end_at?: number | null;
        status?: string;
      },
      planType,
    );

    if (!canCompleteSubscriptionAuth(subscription)) {
      throw new RazorpayPlanConfigError(
        `Subscription "${subscription.id}" cannot accept auth (start_at=${subscription.start_at}).`,
      );
    }

    console.log('[Razorpay] Subscription created:', {
      id: subscription.id,
      status: subscription.status,
      total_count: subscription.total_count,
      start_at: subscription.start_at,
      end_at: subscription.end_at,
      expire_by: subscription.expire_by,
      charge_at: subscription.charge_at,
      remaining_count: subscription.remaining_count,
    });

    return NextResponse.json({
      subscription_id: subscription.id,
      keyId: config.keyId,
      username: user.username,
      email: user.email ?? undefined,
      plan: planType,
      deferredBilling: Boolean(billingStartsAt),
      billingStartsAt: billingStartsAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof RazorpayPlanConfigError) {
      console.error('[Razorpay] Plan configuration error:', error.message);
      logRazorpayDiagnostics(planType, 'plan_config_invalid');
      return NextResponse.json({ error: PLAN_UNAVAILABLE }, { status: 503 });
    }

    console.error('Create subscription error:', error);
    const mapped = mapRazorpayError(error, planType);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

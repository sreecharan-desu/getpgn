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
  fetchAndValidatePlan,
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

    const payload = buildSubscriptionCreatePayload({
      planId,
      planType,
      userId: user.id,
      userEmail: user.email,
    });

    console.log('[Razorpay] Creating subscription:', {
      planType,
      planId,
      total_count: payload.total_count,
      expire_by: payload.expire_by,
      userId: user.id,
    });

    const subscription = await razorpay.subscriptions.create(payload);

    assertSubscriptionBounded(
      subscription as {
        id: string;
        total_count?: number | null;
        end_at?: number | null;
        status?: string;
      },
      planType,
    );

    console.log('[Razorpay] Subscription created:', {
      id: subscription.id,
      status: subscription.status,
      total_count: subscription.total_count,
      end_at: subscription.end_at,
      expire_by: subscription.expire_by,
      remaining_count: subscription.remaining_count,
    });

    return NextResponse.json({
      subscription_id: subscription.id,
      keyId: config.keyId,
      username: user.username,
      email: user.email ?? undefined,
      plan: planType,
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

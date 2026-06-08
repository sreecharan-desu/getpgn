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

export async function POST(req: NextRequest) {
  let planType: 'monthly' | 'yearly' = 'monthly';

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
    const totalCount = planType === 'monthly' ? 60 : 5;

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      notes: {
        userId: user.id,
        planType,
      },
    });

    return NextResponse.json({
      subscription_id: subscription.id,
      keyId: config.keyId,
      username: user.username,
      email: user.email ?? undefined,
      plan: planType,
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    const mapped = mapRazorpayError(error, planType);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

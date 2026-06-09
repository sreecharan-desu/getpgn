import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { mapSubscriptionActionError } from '@/lib/mapSubscriptionActionError';
import {
  createRazorpayClient,
  PAYMENTS_UNAVAILABLE,
  readRazorpayConfig,
} from '@/lib/razorpayServer';

export async function POST() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!user.subscriptionId) {
      return NextResponse.json({ error: 'No subscription found to pause.' }, { status: 400 });
    }

    if (user.paymentProvider !== 'razorpay') {
      return NextResponse.json(
        { error: 'Pause is only available for Razorpay subscriptions.' },
        { status: 400 },
      );
    }

    if (user.subscriptionStatus !== 'active') {
      return NextResponse.json(
        { error: 'Only an active subscription can be paused.' },
        { status: 400 },
      );
    }

    const razorpayEnv = readRazorpayConfig();
    if (!razorpayEnv.ok) {
      return NextResponse.json({ error: PAYMENTS_UNAVAILABLE }, { status: 503 });
    }

    const razorpay = createRazorpayClient(razorpayEnv.config);
    const existing = await razorpay.subscriptions.fetch(user.subscriptionId);

    if (existing.status !== 'active') {
      return NextResponse.json(
        { error: 'Only an active subscription can be paused.' },
        { status: 400 },
      );
    }

    const subscription = await razorpay.subscriptions.pause(user.subscriptionId, {
      pause_at: 'now',
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: subscription.status ?? 'paused',
      },
    });

    console.log(`[Pause Subscription] User ${user.username} paused ${user.subscriptionId}.`);

    return NextResponse.json({
      success: true,
      subscriptionStatus: updatedUser.subscriptionStatus,
    });
  } catch (error) {
    console.error('Subscription pause error:', error);
    const mapped = mapSubscriptionActionError(error, 'pause');
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

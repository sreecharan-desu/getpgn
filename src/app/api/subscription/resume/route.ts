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
      return NextResponse.json({ error: 'No subscription found to resume.' }, { status: 400 });
    }

    if (user.paymentProvider !== 'razorpay') {
      return NextResponse.json(
        { error: 'Resume is only available for Razorpay subscriptions.' },
        { status: 400 },
      );
    }

    if (user.subscriptionStatus !== 'paused') {
      return NextResponse.json(
        { error: 'Only a paused subscription can be resumed.' },
        { status: 400 },
      );
    }

    const razorpayEnv = readRazorpayConfig();
    if (!razorpayEnv.ok) {
      return NextResponse.json({ error: PAYMENTS_UNAVAILABLE }, { status: 503 });
    }

    const razorpay = createRazorpayClient(razorpayEnv.config);
    const existing = await razorpay.subscriptions.fetch(user.subscriptionId);

    if ((existing.status as string) !== 'paused') {
      return NextResponse.json(
        { error: 'Only a paused subscription can be resumed.' },
        { status: 400 },
      );
    }

    const subscription = await razorpay.subscriptions.resume(user.subscriptionId, {
      resume_at: 'now',
    });

    const periodEndSec = subscription.current_end ?? subscription.end_at ?? null;
    const periodStartSec = subscription.current_start ?? subscription.start_at ?? null;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
        ...(periodStartSec
          ? { subscriptionStart: new Date(periodStartSec * 1000) }
          : {}),
        ...(periodEndSec
          ? {
              subscriptionEnd: new Date(periodEndSec * 1000),
              subscriptionExpiresAt: new Date(periodEndSec * 1000),
            }
          : {}),
      },
    });

    console.log(`[Resume Subscription] User ${user.username} resumed ${user.subscriptionId}.`);

    return NextResponse.json({
      success: true,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionEnd: updatedUser.subscriptionEnd?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Subscription resume error:', error);
    const mapped = mapSubscriptionActionError(error, 'resume');
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

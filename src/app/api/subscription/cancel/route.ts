import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
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
      return NextResponse.json({ error: 'No active subscription found to cancel.' }, { status: 400 });
    }

    const razorpayEnv = readRazorpayConfig();
    if (!razorpayEnv.ok) {
      return NextResponse.json({ error: PAYMENTS_UNAVAILABLE }, { status: 503 });
    }

    const razorpay = createRazorpayClient(razorpayEnv.config);

    try {
      // Cancel at the end of the current billing cycle (true = cancel at cycle end)
      await razorpay.subscriptions.cancel(user.subscriptionId, true);
    } catch (err: unknown) {
      // If the subscription is already cancelled on Razorpay, handle it gracefully
      console.warn('[Cancel Subscription] Razorpay API warning:', err);
    }

    // Update subscriptionStatus to cancelled in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'cancelled'
      }
    });

    console.log(`[Cancel Subscription] User ${user.username} cancelled subscription ${user.subscriptionId}.`);

    return NextResponse.json({
      success: true,
      subscriptionStatus: updatedUser.subscriptionStatus
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: "We couldn't cancel your subscription. Please try again." },
      { status: 500 },
    );
  }
}

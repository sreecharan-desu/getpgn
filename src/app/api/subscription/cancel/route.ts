import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import Razorpay from 'razorpay';

export async function POST() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!user.subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found to cancel.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Razorpay keys are not configured.' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

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
    const err = error as Error;
    console.error('Subscription cancellation error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

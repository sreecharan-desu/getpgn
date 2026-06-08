import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { apiError, assertSameOrigin } from '@/lib/security';
import { rateLimitByIp } from '@/lib/rateLimit';
import crypto from 'crypto';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'subscription-verify', 10, 60_000);
  if (limited) return limited;

  const originBlock = assertSameOrigin(req);
  if (originBlock) return originBlock;

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
      await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing verification fields.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 503 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[Verify Subscription] Signature mismatch.');
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
    }

    const existingPayment = await prisma.processedPayment.findUnique({
      where: { razorpayPaymentId: razorpay_payment_id },
      select: { userId: true },
    });
    if (existingPayment && existingPayment.userId !== user.id) {
      return NextResponse.json({ error: 'Payment already used.' }, { status: 409 });
    }

    const subscriptionOwner = await prisma.user.findFirst({
      where: {
        subscriptionId: razorpay_subscription_id,
        NOT: { id: user.id },
      },
      select: { id: true },
    });
    if (subscriptionOwner) {
      return NextResponse.json({ error: 'Subscription already linked.' }, { status: 409 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);

    const notes = (subscription.notes ?? {}) as Record<string, string>;
    if (notes.userId !== user.id) {
      console.error('[Verify Subscription] Subscription userId mismatch.', {
        expected: user.id,
        got: notes.userId,
      });
      return NextResponse.json({ error: 'Subscription does not belong to this account.' }, {
        status: 403,
      });
    }

    const planType = notes.planType === 'yearly' ? 'yearly' : 'monthly';
    const durationDays = planType === 'yearly' ? 365 : 30;
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(now.getDate() + durationDays);

    if (!existingPayment) {
      try {
        await prisma.processedPayment.create({
          data: {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySubscriptionId: razorpay_subscription_id,
            userId: user.id,
          },
        });
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === 'P2002') {
          return NextResponse.json({ error: 'Payment already processed.' }, { status: 409 });
        }
        throw err;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: 'PAID',
        subscriptionId: razorpay_subscription_id,
        subscriptionPlan: planType,
        subscriptionStatus: 'active',
        subscriptionStart: now,
        subscriptionEnd: expiryDate,
        subscriptionExpiresAt: expiryDate,
        paymentProvider: 'razorpay',
      },
    });

    console.log(
      `[Verify Subscription] User ${user.username} upgraded to Pro (${planType}). Expires: ${expiryDate.toISOString()}`,
    );

    return NextResponse.json({
      success: true,
      user: {
        plan: updatedUser.plan,
        subscriptionStatus: updatedUser.subscriptionStatus,
      },
    });
  } catch (error) {
    return apiError('Subscription Verify', error, 'Could not verify subscription.');
  }
}

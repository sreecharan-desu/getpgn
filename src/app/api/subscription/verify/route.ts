import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { apiError, assertSameOrigin } from '@/lib/security';
import { rateLimitByIp } from '@/lib/rateLimit';
import crypto from 'crypto';
import {
  createRazorpayClient,
  readRazorpayConfig,
} from '@/lib/razorpayServer';
import {
  isBillingDeferred,
  type BillingPlanType,
} from '@/lib/razorpaySubscriptions';
import { buildProActivationScanFields } from '@/lib/scanLimits';
import { queueProWelcomeEmail } from '@/lib/welcomeEmail';

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

    const razorpayEnv = readRazorpayConfig();
    if (!razorpayEnv.ok) {
      return NextResponse.json({ error: razorpayEnv.error }, { status: 503 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', razorpayEnv.config.keySecret)
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

    const razorpay = createRazorpayClient(razorpayEnv.config);
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

    const status = subscription.status ?? 'created';
    if (!['authenticated', 'active', 'pending'].includes(status)) {
      console.error('[Verify Subscription] Unexpected subscription status after checkout:', status);
      return NextResponse.json(
        { error: 'Subscription authorisation is not complete. Please try checkout again.' },
        { status: 400 },
      );
    }

    const planType: BillingPlanType = notes.planType === 'yearly' ? 'yearly' : 'monthly';
    const now = new Date();
    const deferred = isBillingDeferred(subscription, now);
    const periodEndSec =
      subscription.current_end ??
      subscription.end_at ??
      null;
    const fallbackExpiry = new Date(
      now.getTime() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000,
    );
    const expiryDate = periodEndSec ? new Date(periodEndSec * 1000) : fallbackExpiry;
    const periodStartSec = subscription.current_start ?? subscription.start_at ?? null;
    const subscriptionStart = periodStartSec ? new Date(periodStartSec * 1000) : now;
    const graceEnd =
      user.subscriptionEnd && user.subscriptionEnd > now ? user.subscriptionEnd : null;

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
      data: deferred
        ? {
            plan: 'PAID',
            subscriptionId: razorpay_subscription_id,
            subscriptionPlan: planType,
            subscriptionStatus: 'authenticated',
            subscriptionStart,
            subscriptionEnd: graceEnd ?? expiryDate,
            subscriptionExpiresAt: graceEnd ?? expiryDate,
            paymentProvider: 'razorpay',
          }
        : {
            plan: 'PAID',
            subscriptionId: razorpay_subscription_id,
            subscriptionPlan: planType,
            subscriptionStatus: 'active',
            subscriptionStart,
            subscriptionEnd: expiryDate,
            subscriptionExpiresAt: expiryDate,
            paymentProvider: 'razorpay',
            ...buildProActivationScanFields(planType, user.monthlyScanMonth),
          },
    });

    console.log(
      deferred
        ? `[Verify Subscription] User ${user.username} scheduled Pro (${planType}). First charge: ${subscriptionStart.toISOString()}`
        : `[Verify Subscription] User ${user.username} upgraded to Pro (${planType}). Expires: ${expiryDate.toISOString()}`,
    );

    if (user.email && !existingPayment) {
      queueProWelcomeEmail(user.email, {
        username: user.username,
        planType,
        status: deferred ? 'authenticated' : 'active',
        subscriptionStart: deferred ? subscriptionStart : undefined,
        subscriptionEnd: updatedUser.subscriptionEnd,
      });
    }

    return NextResponse.json({
      success: true,
      deferredBilling: deferred,
      user: {
        plan: updatedUser.plan,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionStart: updatedUser.subscriptionStart?.toISOString() ?? null,
        subscriptionEnd: updatedUser.subscriptionEnd?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return apiError('Subscription Verify', error, 'Could not verify subscription.');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildProActivationScanFields } from '@/lib/scanLimits';
import {
  createRazorpayClient,
  readRazorpayConfig,
} from '@/lib/razorpayServer';
import {
  findUserIdForRazorpayPayment,
  revokeProForRefund,
} from '@/lib/syncRazorpaySubscription';
import { isBillingDeferred } from '@/lib/razorpaySubscriptions';
import crypto from 'crypto';

function toPaise(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isFullyRefunded(payment: {
  amount?: unknown;
  amount_refunded?: unknown;
}): boolean {
  const amount = toPaise(payment.amount);
  const refunded = toPaise(payment.amount_refunded);
  return amount > 0 && refunded >= amount;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header.' }, { status: 400 });
    }

    if (!webhookSecret) {
      return NextResponse.json({ error: 'Razorpay webhook secret is not configured.' }, { status: 500 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Razorpay Webhook] Signature verification failed.');
      return NextResponse.json({ error: 'Signature verification failed.' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // payment.authorized event handling
    if (event === 'payment.authorized') {
      const paymentEntity = payload.payload.payment?.entity;
      console.log(`[Razorpay Webhook] payment.authorized: ID ${paymentEntity?.id}, Amount ${paymentEntity?.amount}, Status ${paymentEntity?.status}`);
      return NextResponse.json({ received: true });
    }

    // Refund events — revoke Pro immediately on full refund (not at period end).
    if (event === 'refund.processed' || event === 'refund.created') {
      const refundEntity = payload.payload.refund?.entity;
      const paymentEntity = payload.payload.payment?.entity;
      const paymentId =
        refundEntity?.payment_id ?? paymentEntity?.id ?? null;

      if (!paymentId) {
        console.warn('[Razorpay Webhook] Refund event missing payment id:', event);
        return NextResponse.json({ received: true });
      }

      const subscriptionId =
        paymentEntity?.subscription_id ??
        (paymentEntity as { notes?: { subscription_id?: string } })?.notes
          ?.subscription_id ??
        null;

      const userId = await findUserIdForRazorpayPayment(paymentId, subscriptionId);
      if (!userId) {
        console.error(
          `[Razorpay Webhook] User not found for refund on payment ${paymentId}`,
        );
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      if (user.subscriptionStatus === 'refunded') {
        console.log(`[Razorpay Webhook] Duplicate refund event for user ${user.username}.`);
        return NextResponse.json({ received: true });
      }

      let shouldRevoke = false;
      const refundAmount = refundEntity?.amount ?? 0;

      const razorpayEnv = readRazorpayConfig();
      if (razorpayEnv.ok) {
        const razorpay = createRazorpayClient(razorpayEnv.config);
        try {
          const payment = await razorpay.payments.fetch(paymentId);
          shouldRevoke = isFullyRefunded(payment);
        } catch (err) {
          console.warn('[Razorpay Webhook] Could not fetch payment for refund check:', err);
        }
      }

      if (!shouldRevoke && paymentEntity && refundAmount > 0) {
        const paymentAmount = paymentEntity.amount ?? 0;
        const totalRefunded = paymentEntity.amount_refunded ?? refundAmount;
        shouldRevoke = paymentAmount > 0 && totalRefunded >= paymentAmount;
      }

      if (shouldRevoke) {
        await revokeProForRefund(userId);
        console.log(
          `[Razorpay Webhook] Revoked Pro for ${user.username} after ${event} on ${paymentId}.`,
        );
      } else {
        console.log(
          `[Razorpay Webhook] Refund ${refundEntity?.id ?? 'n/a'} on ${paymentId} is partial or pending — Pro unchanged.`,
        );
      }

      return NextResponse.json({ received: true });
    }

    const subscriptionEntity = payload.payload.subscription?.entity;
    if (!subscriptionEntity) {
      console.warn('[Razorpay Webhook] Missing subscription entity for event:', event);
      return NextResponse.json({ received: true });
    }

    const subscriptionId = subscriptionEntity.id;
    const userId = subscriptionEntity.notes?.userId;

    // Find the user by subscriptionId, or by userId in the notes
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { subscriptionId: subscriptionId },
          userId ? { id: userId } : {}
        ]
      }
    });

    if (!user) {
      console.error(`[Razorpay Webhook] User not found for subscription ${subscriptionId} or userId ${userId}`);
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const start = subscriptionEntity.current_start ? new Date(subscriptionEntity.current_start * 1000) : null;
    const end = subscriptionEntity.current_end ? new Date(subscriptionEntity.current_end * 1000) : null;
    const planType = subscriptionEntity.notes?.planType || user.subscriptionPlan || 'monthly';

    const activatePro = async (source: string) => {
      if (
        user.subscriptionStatus === 'active' &&
        user.subscriptionEnd &&
        end &&
        user.subscriptionEnd.getTime() === end.getTime()
      ) {
        console.log(`[Razorpay Webhook] Duplicate ${source} event. User is already active for this period. Skipping update.`);
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'PAID',
          subscriptionId: subscriptionId,
          subscriptionPlan: planType,
          subscriptionStatus: 'active',
          subscriptionStart: start,
          subscriptionEnd: end,
          subscriptionExpiresAt: end,
          paymentProvider: 'razorpay',
          ...buildProActivationScanFields(planType, user.monthlyScanMonth),
        },
      });
      console.log(`[Razorpay Webhook] Upgraded user ${user.username} (Pro active) via ${source}. Expires: ${end?.toISOString()}`);
    };

    switch (event) {
      case 'subscription.authenticated': {
        if (isBillingDeferred(subscriptionEntity)) {
          const billingStart = subscriptionEntity.start_at
            ? new Date(subscriptionEntity.start_at * 1000)
            : start;
          const graceEnd =
            user.subscriptionEnd && user.subscriptionEnd > new Date()
              ? user.subscriptionEnd
              : end;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: 'PAID',
              subscriptionId: subscriptionId,
              subscriptionPlan: planType,
              subscriptionStatus: 'authenticated',
              subscriptionStart: billingStart,
              ...(graceEnd
                ? { subscriptionEnd: graceEnd, subscriptionExpiresAt: graceEnd }
                : {}),
              paymentProvider: 'razorpay',
            },
          });
          console.log(
            `[Razorpay Webhook] User ${user.username} mandate authorised; billing starts ${billingStart?.toISOString()}.`,
          );
          break;
        }

        await activatePro(event);
        break;
      }

      case 'subscription.activated':
      case 'subscription.charged': {
        await activatePro(event);
        break;
      }

      case 'subscription.paused': {
        if (user.subscriptionStatus === 'paused') {
          console.log(`[Razorpay Webhook] Duplicate subscription.paused event. Skipping.`);
          break;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'paused',
          },
        });
        console.log(`[Razorpay Webhook] User ${user.username}'s subscription paused.`);
        break;
      }

      case 'subscription.resumed': {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'active',
            subscriptionStart: start,
            subscriptionEnd: end,
            ...(end ? { subscriptionExpiresAt: end } : {}),
          },
        });
        console.log(`[Razorpay Webhook] User ${user.username}'s subscription resumed.`);
        break;
      }

      case 'subscription.cancelled': {
        if (user.subscriptionStatus === 'cancelled') {
          console.log(`[Razorpay Webhook] Duplicate subscription.cancelled event. Skipping update.`);
          break;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: 'cancelled'
          }
        });
        console.log(`[Razorpay Webhook] User ${user.username}'s subscription cancelled.`);
        break;
      }

      case 'subscription.halted': {
        if (user.subscriptionStatus === 'halted') {
          console.log(`[Razorpay Webhook] Duplicate subscription.halted event. Skipping.`);
          break;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: 'FREE',
            subscriptionStatus: 'halted'
          }
        });
        console.log(`[Razorpay Webhook] User ${user.username}'s subscription halted. Revoked premium.`);
        break;
      }

      case 'subscription.completed': {
        if (user.subscriptionStatus === 'expired') {
          console.log(`[Razorpay Webhook] Duplicate subscription.completed event. Skipping.`);
          break;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: 'FREE',
            subscriptionStatus: 'expired'
          }
        });
        console.log(`[Razorpay Webhook] User ${user.username}'s subscription completed. Revoked premium.`);
        break;
      }

      default:
        console.log(`[Razorpay Webhook] Unhandled event type: ${event}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    const err = error as Error;
    console.error('[Razorpay Webhook] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

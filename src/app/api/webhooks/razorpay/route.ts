import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

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

    switch (event) {
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.charged': {
        // Prevent duplicate updates
        if (
          user.subscriptionStatus === 'active' &&
          user.subscriptionEnd &&
          end &&
          user.subscriptionEnd.getTime() === end.getTime()
        ) {
          console.log(`[Razorpay Webhook] Duplicate ${event} event. User is already active for this period. Skipping update.`);
          break;
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
            paymentProvider: 'razorpay'
          }
        });
        console.log(`[Razorpay Webhook] Upgraded user ${user.username} (Pro active) via ${event}. Expires: ${end?.toISOString()}`);
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

import { prisma } from '@/lib/db';
import {
  createRazorpayClient,
  readRazorpayConfig,
} from '@/lib/razorpayServer';
import type { SessionUser } from '@/lib/session';

export type RazorpaySyncUser = Pick<
  SessionUser,
  'id' | 'subscriptionId' | 'subscriptionStatus' | 'paymentProvider' | 'plan'
>;

export type SyncRazorpayResult = {
  updated: boolean;
  reason: string;
};

/** Revoke Pro immediately after a full refund (manual or webhook). */
export async function revokeProForRefund(userId: string): Promise<void> {
  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'FREE',
      subscriptionStatus: 'refunded',
      subscriptionExpiresAt: now,
      subscriptionEnd: now,
    },
  });
}

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

/** True when a Razorpay user may still have stale Pro after cancel/refund. */
export function shouldSyncRazorpaySubscription(user: RazorpaySyncUser): boolean {
  if (user.paymentProvider !== 'razorpay' || !user.subscriptionId) return false;
  if (user.subscriptionStatus === 'refunded') return false;
  return user.plan === 'PAID' || user.subscriptionStatus === 'cancelled';
}

/**
 * Reconcile DB with Razorpay — catches manual refunds and missed webhooks.
 * Narrow scope: only runs for Razorpay users who may still show Pro incorrectly.
 */
export async function syncRazorpaySubscription(
  user: RazorpaySyncUser,
): Promise<SyncRazorpayResult> {
  if (!shouldSyncRazorpaySubscription(user)) {
    return { updated: false, reason: 'skip' };
  }

  const razorpayEnv = readRazorpayConfig();
  if (!razorpayEnv.ok) {
    return { updated: false, reason: 'razorpay_unavailable' };
  }

  const razorpay = createRazorpayClient(razorpayEnv.config);

  try {
    const invoices = await razorpay.invoices.all({
      subscription_id: user.subscriptionId!,
      count: 100,
    });

    const paidInvoices = (invoices.items ?? [])
      .filter((inv) => inv.status === 'paid' && inv.payment_id)
      .sort(
        (a, b) =>
          (b.paid_at ?? b.created_at ?? 0) - (a.paid_at ?? a.created_at ?? 0),
      );

    if (paidInvoices.length === 0) {
      return { updated: false, reason: 'no_paid_invoices' };
    }

    const latestPaymentId = paidInvoices[0].payment_id as string;
    const payment = await razorpay.payments.fetch(latestPaymentId);

    if (isFullyRefunded(payment)) {
      await revokeProForRefund(user.id);
      console.log(
        `[Razorpay Sync] Revoked Pro for user ${user.id} — payment ${latestPaymentId} fully refunded.`,
      );
      return { updated: true, reason: 'full_refund_detected' };
    }

    const subscription = await razorpay.subscriptions.fetch(user.subscriptionId!);
    const remoteStatus = subscription.status as string | undefined;

    if (remoteStatus === 'halted' && user.plan === 'PAID') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'FREE',
          subscriptionStatus: 'halted',
        },
      });
      return { updated: true, reason: 'subscription_halted' };
    }

    if (remoteStatus === 'completed' && user.plan === 'PAID') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'FREE',
          subscriptionStatus: 'expired',
        },
      });
      return { updated: true, reason: 'subscription_completed' };
    }

    return { updated: false, reason: 'no_change' };
  } catch (error) {
    console.error('[Razorpay Sync] Failed for user', user.id, error);
    return { updated: false, reason: 'error' };
  }
}

/** Resolve user for a Razorpay payment id (processed_payments or subscription link). */
export async function findUserIdForRazorpayPayment(
  paymentId: string,
  subscriptionId?: string | null,
): Promise<string | null> {
  const processed = await prisma.processedPayment.findUnique({
    where: { razorpayPaymentId: paymentId },
    select: { userId: true },
  });
  if (processed) return processed.userId;

  let subId = subscriptionId ?? null;
  if (!subId) {
    const razorpayEnv = readRazorpayConfig();
    if (razorpayEnv.ok) {
      const razorpay = createRazorpayClient(razorpayEnv.config);
      try {
        const payment = await razorpay.payments.fetch(paymentId);
        subId = (payment as { subscription_id?: string }).subscription_id ?? null;
      } catch {
        // ignore — caller may still have subscriptionId
      }
    }
  }

  if (!subId) return null;

  const user = await prisma.user.findFirst({
    where: { subscriptionId: subId },
    select: { id: true },
  });
  return user?.id ?? null;
}

import crypto from 'crypto';
import type Razorpay from 'razorpay';
import {
  calculateOrganizerAmount,
  calculateOrganizerAmountPaise,
  parseOrganizerScanCount,
} from '@/lib/organizerPricing';
import { prisma } from '@/lib/db';
import { createRazorpayClient, readRazorpayConfig } from '@/lib/razorpayServer';

export function verifyRazorpayOrderPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = crypto
    .createHmac('sha256', params.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');
  return expected === params.signature;
}

export async function createOrganizerScanOrder(params: {
  userId: string;
  username: string;
  scans: number;
}): Promise<
  | {
      ok: true;
      orderId: string;
      amount: number;
      amountPaise: number;
      scans: number;
      keyId: string;
    }
  | { ok: false; status: number; message: string }
> {
  const scans = parseOrganizerScanCount(params.scans);
  if (!scans) {
    return {
      ok: false,
      status: 400,
      message: `Minimum purchase is ${4000} scans.`,
    };
  }

  const razorpayEnv = readRazorpayConfig();
  if (!razorpayEnv.ok) {
    return { ok: false, status: 503, message: razorpayEnv.error };
  }

  const amount = calculateOrganizerAmount(scans);
  const amountPaise = calculateOrganizerAmountPaise(scans);
  const receipt = `org_${params.userId.slice(0, 8)}_${Date.now()}`.slice(0, 40);

  const razorpay = createRazorpayClient(razorpayEnv.config);

  let order: { id: string };
  try {
    order = (await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId: params.userId,
        username: params.username,
        scans: String(scans),
        product: 'organizer_scans',
      },
    })) as { id: string };
  } catch (error) {
    console.error('[Organizer Order] Razorpay create failed:', error);
    return {
      ok: false,
      status: 502,
      message: "We couldn't start checkout. Please try again.",
    };
  }

  await prisma.organizerPurchase.create({
    data: {
      userId: params.userId,
      scansPurchased: scans,
      amount,
      razorpayOrderId: order.id,
      status: 'PENDING',
    },
  });

  return {
    ok: true,
    orderId: order.id,
    amount,
    amountPaise,
    scans,
    keyId: razorpayEnv.config.keyId,
  };
}

/** Webhook helper — confirm order entity matches a pending purchase. */
export async function fetchRazorpayOrder(
  razorpay: Razorpay,
  orderId: string,
): Promise<{ id: string; status: string; amount: number } | null> {
  try {
    const order = (await razorpay.orders.fetch(orderId)) as {
      id: string;
      status: string;
      amount: number;
    };
    return order;
  } catch {
    return null;
  }
}

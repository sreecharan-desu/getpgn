import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { assertSameOrigin } from '@/lib/security';
import { rateLimitByIp } from '@/lib/rateLimit';
import { readRazorpayConfig } from '@/lib/razorpayServer';
import { verifyRazorpayOrderPaymentSignature } from '@/lib/razorpayOrders';
import { completeOrganizerPurchase } from '@/lib/organizerWallet';
import { notifyOrganizerCreditsAdded } from '@/lib/notificationEmail';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'organizer-order-verify', 12, 60_000);
  if (limited) return limited;

  const originBlock = assertSameOrigin(req);
  if (originBlock) return originBlock;

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing verification fields.' }, { status: 400 });
    }

    const razorpayEnv = readRazorpayConfig();
    if (!razorpayEnv.ok) {
      return NextResponse.json({ error: razorpayEnv.error }, { status: 503 });
    }

    const valid = verifyRazorpayOrderPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      keySecret: razorpayEnv.config.keySecret,
    });

    if (!valid) {
      console.error('[Organizer Verify] Signature mismatch.');
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
    }

    const purchase = await prisma.organizerPurchase.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!purchase || purchase.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const credited = await completeOrganizerPurchase({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    if (!credited.ok) {
      return NextResponse.json({ error: credited.error }, { status: 409 });
    }

    if (!credited.alreadyCompleted) {
      void notifyOrganizerCreditsAdded({
        userId: auth.user.id,
        scansAdded: purchase.scansPurchased,
        source: 'purchase',
      }).catch((err) =>
        console.error('[Organizer Verify] Credits notification failed:', err),
      );
    }

    const account = await prisma.organizerAccount.findUnique({
      where: { userId: auth.user.id },
      select: {
        availableScans: true,
        totalScansPurchased: true,
        totalScansUsed: true,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyCompleted: credited.alreadyCompleted,
      scansAdded: purchase.scansPurchased,
      account,
    });
  } catch (error) {
    console.error('[Organizer Verify]', error);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}

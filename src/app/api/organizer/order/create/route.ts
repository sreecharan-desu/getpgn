import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { assertSameOrigin } from '@/lib/security';
import { rateLimitByIp } from '@/lib/rateLimit';
import { createOrganizerScanOrder } from '@/lib/razorpayOrders';
import { parseOrganizerScanCount } from '@/lib/organizerPricing';

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'organizer-order-create', 8, 60_000);
  if (limited) return limited;

  const originBlock = assertSameOrigin(req);
  if (originBlock) return originBlock;

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const scans = parseOrganizerScanCount(body?.scans);
    if (!scans) {
      return NextResponse.json(
        { error: 'Enter a whole number of scans (minimum 4,000).' },
        { status: 400 },
      );
    }

    const result = await createOrganizerScanOrder({
      userId: auth.user.id,
      username: auth.user.username,
      scans,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json({
      orderId: result.orderId,
      amount: result.amount,
      amountPaise: result.amountPaise,
      scans: result.scans,
      keyId: result.keyId,
      currency: 'INR',
    });
  } catch (error) {
    console.error('[Organizer Order Create]', error);
    return NextResponse.json(
      { error: "We couldn't start checkout. Please try again." },
      { status: 500 },
    );
  }
}

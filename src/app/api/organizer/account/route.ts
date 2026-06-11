import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { getOrganizerAccount } from '@/lib/organizerWallet';
import {
  ORGANIZER_DEFAULT_SCANS,
  ORGANIZER_MIN_SCANS,
  calculateOrganizerAmount,
} from '@/lib/organizerPricing';

export async function GET() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const account = await getOrganizerAccount(auth.user.id);
    const purchases = await prisma.organizerPurchase.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        scansPurchased: true,
        amount: true,
        status: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({
      account,
      purchases,
      pricing: {
        plan: 'enterprise_pay_as_you_go',
        minScans: ORGANIZER_MIN_SCANS,
        minPackInr: calculateOrganizerAmount(ORGANIZER_MIN_SCANS),
        defaultScans: ORGANIZER_DEFAULT_SCANS,
      },
    });
  } catch (error) {
    console.error('[Organizer Account]', error);
    return NextResponse.json({ error: 'Could not load organizer account.' }, { status: 500 });
  }
}

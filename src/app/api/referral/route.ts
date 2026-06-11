import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { getAppUrl } from '@/lib/emailConfig';
import { ensureReferralCode } from '@/lib/referrals';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const code = await ensureReferralCode(auth.user.id);
    const appUrl = getAppUrl();
    const link = `${appUrl}/signup?ref=${encodeURIComponent(code)}`;

    const referrals = await prisma.referral.findMany({
      where: { referrerId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        referee: { select: { username: true } },
      },
    });

    return NextResponse.json({
      code,
      link,
      referrals: referrals.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        refereeUsername: r.referee.username,
      })),
    });
  } catch (error) {
    console.error('[Referral API] GET error:', error);
    return NextResponse.json({ error: 'Could not load referral info.' }, { status: 500 });
  }
}

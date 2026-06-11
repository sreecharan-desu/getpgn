import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { acknowledgeReferralBonusNotice } from '@/lib/referralNotifications';

export async function POST() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    await acknowledgeReferralBonusNotice(auth.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Referral Ack Bonus] Error:', error);
    return NextResponse.json({ error: 'Could not acknowledge referral notice.' }, { status: 500 });
  }
}

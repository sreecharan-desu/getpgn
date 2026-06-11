import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiKey } from '@/lib/adminAuth';
import { adminCreditOrganizerScans } from '@/lib/organizerWallet';
import { notifyOrganizerCreditsAdded } from '@/lib/notificationEmail';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const denied = requireAdminApiKey(req);
  if (denied) return denied;

  try {
    const { userId } = await params;
    const body = await req.json();
    const scans =
      typeof body?.scans === 'number'
        ? Math.floor(body.scans)
        : Number.parseInt(String(body?.scans ?? ''), 10);

    if (!Number.isFinite(scans) || scans < 1) {
      return NextResponse.json({ error: 'Invalid scan count.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const account = await adminCreditOrganizerScans({ userId, scans });

    void notifyOrganizerCreditsAdded({
      userId,
      scansAdded: scans,
      source: 'admin',
    }).catch((err) =>
      console.error('[Admin Organizer Credit] Notification failed:', err),
    );

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error('[Admin Organizer Credit]', error);
    return NextResponse.json({ error: 'Could not credit scans.' }, { status: 500 });
  }
}

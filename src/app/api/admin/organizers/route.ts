import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiKey } from '@/lib/adminAuth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const denied = requireAdminApiKey(req);
  if (denied) return denied;

  try {
    const accounts = await prisma.organizerAccount.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, username: true, email: true, plan: true } },
      },
    });

    const recentPurchases = await prisma.organizerPurchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
    });

    return NextResponse.json({ accounts, recentPurchases });
  } catch (error) {
    console.error('[Admin Organizers]', error);
    return NextResponse.json({ error: 'Could not load organizer data.' }, { status: 500 });
  }
}

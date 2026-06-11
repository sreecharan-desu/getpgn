import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import {
  ORGANIZER_PURCHASES_PAGE_SIZE,
  decodeOrganizerPurchaseCursor,
  encodeOrganizerPurchaseCursor,
} from '@/lib/organizerPurchasesQuery';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const limitRaw = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), ORGANIZER_PURCHASES_PAGE_SIZE)
      : ORGANIZER_PURCHASES_PAGE_SIZE;
    const cursor = decodeOrganizerPurchaseCursor(searchParams.get('cursor'));

    const where = {
      userId: auth.user.id,
      status: 'COMPLETED' as const,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              {
                createdAt: new Date(cursor.createdAt),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.organizerPurchase.count({
        where: { userId: auth.user.id, status: 'COMPLETED' },
      }),
      prisma.organizerPurchase.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
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
      }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeOrganizerPurchaseCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null;

    return NextResponse.json({
      purchases: page.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      })),
      total,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error('[Organizer Purchases]', error);
    return NextResponse.json(
      { error: 'Could not load prepaid purchase history.' },
      { status: 500 },
    );
  }
}

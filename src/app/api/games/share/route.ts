import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!isProUser(user)) {
      return NextResponse.json({
        error: 'Public sharing links are a premium feature. Please upgrade.'
      }, { status: 403 });
    }

    const { gameId, action } = await req.json(); // action can be 'enable' or 'disable'
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required.' }, { status: 400 });
    }

    // Verify game ownership
    const game = await prisma.savedGame.findFirst({
      where: { id: gameId, userId: user.id },
      select: { id: true },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found or access denied.' }, { status: 404 });
    }

    if (action === 'disable') {
      await prisma.publicLink.updateMany({
        where: { gameId },
        data: { enabled: false },
      });
      return NextResponse.json({ success: true, enabled: false });
    }

    const slug = crypto.randomBytes(16).toString('hex');
    const publicLink = await prisma.publicLink.upsert({
      where: { gameId },
      create: { gameId, slug, enabled: true },
      update: { enabled: true },
    });

    return NextResponse.json({ success: true, enabled: true, slug: publicLink.slug });

  } catch (error) {
    const err = error as Error;
    console.error('Share game error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

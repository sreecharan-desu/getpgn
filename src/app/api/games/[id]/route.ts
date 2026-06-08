import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';
import { savedGameDetailSelect } from '@/lib/dbSelects';
import { createValidationSessionToken } from '@/lib/validationSession';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!isProUser(user)) {
      return NextResponse.json({ error: 'History logging is only accessible on active Paid plans.' }, { status: 403 });
    }

    const { id } = await context.params;

    const game = await prisma.savedGame.findFirst({
      where: { id, userId: user.id },
      select: savedGameDetailSelect,
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      game,
      validationToken: createValidationSessionToken(user.id),
    });
  } catch (error) {
    const err = error as Error;
    console.error('Fetch game error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    if (!isProUser(user)) {
      return NextResponse.json(
        { error: 'History persistence is only available for Paid plans. Please upgrade.' },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const pgn = typeof body.pgn === 'string' ? body.pgn : undefined;
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    const movesJson =
      body.movesJson == null
        ? undefined
        : typeof body.movesJson === 'string'
          ? body.movesJson
          : JSON.stringify(body.movesJson);

    if (!pgn && !movesJson && !title) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    if (title && title.length > 200) {
      return NextResponse.json({ error: 'Title too long (max 200 characters).' }, { status: 400 });
    }

    if (pgn !== undefined && pgn.length > 100_000) {
      return NextResponse.json({ error: 'PGN too large.' }, { status: 413 });
    }

    if (movesJson !== undefined && movesJson.length > 500_000) {
      return NextResponse.json({ error: 'Move data too large.' }, { status: 413 });
    }

    const updated = await prisma.savedGame.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(pgn !== undefined ? { pgn } : {}),
        ...(movesJson !== undefined ? { movesJson } : {}),
        ...(title ? { title } : {}),
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    const game = await prisma.savedGame.findFirst({
      where: { id, userId: user.id },
      select: savedGameDetailSelect,
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, game });
  } catch (error) {
    const err = error as Error;
    console.error('Update game error:', err);
    return NextResponse.json({ error: 'Could not update game.' }, { status: 500 });
  }
}

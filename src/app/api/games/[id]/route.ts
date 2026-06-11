import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { requirePaidLibraryAccess } from '@/lib/requirePaidLibrary';
import { savedGameDetailSelect } from '@/lib/dbSelects';
import { injectPlayerNamesIntoPgn, validatePlayerNames } from '@/lib/playerNames';
import { createValidationSessionToken } from '@/lib/validationSession';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const library = await requirePaidLibraryAccess(user);
    if (!library.ok) return library.response;

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

    const library = await requirePaidLibraryAccess(user);
    if (!library.ok) return library.response;

    const { id } = await context.params;
    const body = await req.json();
    const pgn = typeof body.pgn === 'string' ? body.pgn : undefined;
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    const hasWhite = typeof body.whitePlayer === 'string';
    const hasBlack = typeof body.blackPlayer === 'string';
    const movesJson =
      body.movesJson == null
        ? undefined
        : typeof body.movesJson === 'string'
          ? body.movesJson
          : JSON.stringify(body.movesJson);
    const confirmSave = body.confirmSave === true;

    if (!pgn && !movesJson && !title && !hasWhite && !hasBlack && !confirmSave) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    if (title && title.length > 200) {
      return NextResponse.json({ error: 'Title too long (max 200 characters).' }, { status: 400 });
    }

    const existing = await prisma.savedGame.findFirst({
      where: { id, userId: user.id },
      select: { pgn: true, whitePlayer: true, blackPlayer: true, isDraft: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
    }

    let whitePlayer = existing.whitePlayer;
    let blackPlayer = existing.blackPlayer;
    if (hasWhite || hasBlack) {
      const names = validatePlayerNames(
        hasWhite ? body.whitePlayer : whitePlayer,
        hasBlack ? body.blackPlayer : blackPlayer,
      );
      if (!names.ok) {
        return NextResponse.json({ error: names.error }, { status: 400 });
      }
      whitePlayer = names.whitePlayer;
      blackPlayer = names.blackPlayer;
    }

    const basePgn = pgn ?? existing.pgn;
    const pgnOut =
      hasWhite || hasBlack
        ? injectPlayerNamesIntoPgn(basePgn, whitePlayer, blackPlayer)
        : pgn;

    if (pgnOut !== undefined && pgnOut.length > 100_000) {
      return NextResponse.json({ error: 'PGN too large.' }, { status: 413 });
    }

    if (movesJson !== undefined && movesJson.length > 500_000) {
      return NextResponse.json({ error: 'Move data too large.' }, { status: 413 });
    }

    const updated = await prisma.savedGame.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(pgnOut !== undefined ? { pgn: pgnOut } : {}),
        ...(movesJson !== undefined ? { movesJson } : {}),
        ...(title ? { title } : {}),
        ...(hasWhite || hasBlack ? { whitePlayer, blackPlayer } : {}),
        ...(confirmSave ? { isDraft: false } : {}),
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

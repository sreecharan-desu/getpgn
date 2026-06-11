import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { requirePaidLibraryAccess } from '@/lib/requirePaidLibrary';
import { injectPlayerNamesIntoPgn, parseMetadataFromPgn } from '@/lib/playerNames';

/** Premium scan: temporary draft + share link until user confirms save to library. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const library = await requirePaidLibraryAccess(user);
    if (!library.ok) return library.response;

    const { pgn, movesJson } = await req.json();
    if (!pgn || !movesJson) {
      return NextResponse.json(
        { error: 'PGN and moves list are required.' },
        { status: 400 },
      );
    }

    const meta = parseMetadataFromPgn(String(pgn));
    const pgnWithPlayers = injectPlayerNamesIntoPgn(
      String(pgn),
      meta.whitePlayer,
      meta.blackPlayer,
    );
    const moves =
      typeof movesJson === 'string' ? movesJson : JSON.stringify(movesJson);

    const game = await prisma.savedGame.create({
      data: {
        userId: user.id,
        title: meta.title.slice(0, 200),
        whitePlayer: meta.whitePlayer,
        blackPlayer: meta.blackPlayer,
        pgn: pgnWithPlayers,
        movesJson: moves,
        isDraft: true,
      },
      select: {
        id: true,
        title: true,
        whitePlayer: true,
        blackPlayer: true,
        createdAt: true,
      },
    });

    const publicLink = await prisma.publicLink.create({
      data: {
        gameId: game.id,
        slug: crypto.randomBytes(16).toString('hex'),
        enabled: true,
      },
      select: { slug: true },
    });

    return NextResponse.json({
      success: true,
      game: {
        ...game,
        createdAt: game.createdAt.toISOString(),
        isDraft: true,
      },
      slug: publicLink.slug,
      isDraft: true,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Scan draft save error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

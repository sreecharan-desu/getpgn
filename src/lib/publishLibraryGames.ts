import crypto from 'crypto';
import { prisma } from '@/lib/db';

const BATCH_SIZE = 100;

/** Create enabled public links for saved games that don't have one yet. */
export async function publishAllSavedGames(userId: string): Promise<{
  published: number;
  sharedTotal: number;
}> {
  let published = 0;

  for (;;) {
    const batch = await prisma.savedGame.findMany({
      where: { userId, isDraft: false, publicLink: null },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (!batch.length) break;

    await prisma.publicLink.createMany({
      data: batch.map((game) => ({
        gameId: game.id,
        slug: crypto.randomBytes(16).toString('hex'),
        enabled: true,
      })),
    });

    published += batch.length;
  }

  const sharedTotal = await prisma.savedGame.count({
    where: { userId, isDraft: false, publicLink: { enabled: true } },
  });

  return { published, sharedTotal };
}

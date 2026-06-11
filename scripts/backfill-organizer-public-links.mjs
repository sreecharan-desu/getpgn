#!/usr/bin/env node
/**
 * Enable public share links for an organizer's saved games (so they appear on /library/[slug]).
 * Does not delete or recreate games.
 *
 * Usage: node --env-file=.env scripts/backfill-organizer-public-links.mjs [username]
 */
import { randomBytes, randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const USERNAME = process.argv[2] || 'organizer_abcchess';
const BATCH_SIZE = 100;

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: USERNAME },
    select: { id: true, username: true },
  });

  if (!user) {
    console.error(`User "${USERNAME}" not found.`);
    process.exit(1);
  }

  const missing = await prisma.savedGame.findMany({
    where: { userId: user.id, publicLink: null },
    select: { id: true },
  });

  if (!missing.length) {
    const shared = await prisma.savedGame.count({
      where: { userId: user.id, publicLink: { enabled: true } },
    });
    console.log(`@${user.username}: all games already have share links (${shared} shared).`);
    return;
  }

  let linked = 0;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    await prisma.publicLink.createMany({
      data: batch.map((game) => ({
        id: randomUUID(),
        gameId: game.id,
        slug: randomBytes(16).toString('hex'),
        enabled: true,
      })),
    });
    linked += batch.length;
    process.stdout.write(`\r  Linked ${linked}/${missing.length}`);
  }

  const library = await prisma.organizerLibrary.findUnique({
    where: { userId: user.id },
    select: { slug: true, enabled: true },
  });

  console.log(`\n✓ Created ${linked} public links for @${user.username}`);
  if (library?.enabled && library.slug) {
    console.log(`  Library: /library/${library.slug}`);
  } else {
    console.log('  Enable the organizer library in Account → Organizer library');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

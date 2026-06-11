#!/usr/bin/env node
/**
 * Dev-only: simulate Enterprise purchase + seed valid saved games.
 * Usage: node --env-file=.env scripts/seed-organizer-test-data.mjs [username] [gameCount]
 */
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Chess } from 'chess.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USERNAME = process.argv[2] || 'organizer_abcchess';
const TARGET_GAMES = Math.min(5000, Math.max(1, parseInt(process.argv[3] || '1000', 10)));
const BATCH_SIZE = 50;

function slugFromUserId(userId) {
  return createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

/** Public share links are required for games to appear on /library/[slug]. */
async function ensurePublicLinksForUser(userId) {
  const games = await prisma.savedGame.findMany({
    where: { userId, publicLink: null },
    select: { id: true },
  });
  if (!games.length) return 0;

  let linked = 0;
  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);
    await prisma.publicLink.createMany({
      data: batch.map((game) => ({
        id: randomUUID(),
        gameId: game.id,
        slug: randomBytes(16).toString('hex'),
        enabled: true,
      })),
    });
    linked += batch.length;
    process.stdout.write(`\r  Public links: ${linked}/${games.length}`);
  }
  if (games.length) process.stdout.write('\n');
  return linked;
}

const OPENING_LINES = [
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'],
  ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5'],
  ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'],
  ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5'],
  ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2'],
  ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3'],
  ['g3', 'd5', 'Bg2', 'Nf6', 'Nf3', 'e6', 'O-O'],
  ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'd5', 'cxd5'],
  ['Nf3', 'd5', 'd4', 'Nf6', 'c4', 'e6', 'Nc3'],
  ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'd6', 'Nf3'],
];

const FIRST_NAMES = [
  'Arjun', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Karthik', 'Sneha',
  'Aditya', 'Lakshmi', 'Dev', 'Isha', 'Nikhil', 'Pooja', 'Rahul', 'Divya',
  'Sanjay', 'Kavya', 'Manish', 'Neha', 'Amit', 'Riya', 'Suresh', 'Tanvi',
];
const LAST_NAMES = [
  'Sharma', 'Patel', 'Iyer', 'Reddy', 'Gupta', 'Nair', 'Menon', 'Kapoor',
  'Singh', 'Das', 'Rao', 'Pillai', 'Verma', 'Joshi', 'Khan', 'Malhotra',
];

function pickPlayer(seed, role) {
  const fi = (seed * 7 + (role === 'w' ? 1 : 3)) % FIRST_NAMES.length;
  const li = (seed * 11 + (role === 'w' ? 2 : 5)) % LAST_NAMES.length;
  return `${FIRST_NAMES[fi]} ${LAST_NAMES[li]}`;
}

function emptyPly() {
  return {
    original: '',
    status: 'missing',
    san: null,
    candidates: [],
    suggestions: [],
    fen: null,
    uci: null,
  };
}

/** Play a complete legal game; returns turns + pgn headers. */
function generateAccurateGame(gameIndex) {
  const chess = new Chess();
  const turns = [];
  const opening = OPENING_LINES[gameIndex % OPENING_LINES.length];
  let openingIdx = 0;
  let plyGlobal = 0;

  const playPly = (isWhite, notation) => {
    let played = notation;
    let move;
    try {
      move = chess.move(played);
    } catch {
      const legal = chess.moves({ verbose: true });
      if (!legal.length) return false;
      const pick = legal[(gameIndex * 31 + plyGlobal * 13) % legal.length];
      played = pick.san;
      move = chess.move({ from: pick.from, to: pick.to, promotion: pick.promotion });
    }

    const ply = {
      original: played,
      status: 'valid',
      san: move.san,
      candidates: [],
      suggestions: [],
      fen: chess.fen(),
      uci: `${move.from}${move.to}${move.promotion || ''}`,
    };
    plyGlobal++;

    const moveNumber = isWhite ? Math.ceil(plyGlobal / 2) : Math.floor((plyGlobal + 1) / 2);
    let turn = turns.find((t) => t.moveNumber === moveNumber);
    if (!turn) {
      turn = { moveNumber, white: emptyPly(), black: emptyPly() };
      turns.push(turn);
    }
    if (isWhite) turn.white = ply;
    else turn.black = ply;
    return true;
  };

  while (!chess.isGameOver() && plyGlobal < 120) {
    const isWhite = plyGlobal % 2 === 0;
    let notation = null;
    if (openingIdx < opening.length) {
      notation = opening[openingIdx++];
    } else {
      const legal = chess.moves({ verbose: true });
      if (!legal.length) break;
      const pick = legal[(gameIndex * 47 + plyGlobal * 19) % legal.length];
      notation = pick.san;
    }
    if (!playPly(isWhite, notation)) break;
  }

  const white = pickPlayer(gameIndex, 'w');
  const black = pickPlayer(gameIndex + 17, 'b');
  let result = '*';
  if (chess.isCheckmate()) result = chess.turn() === 'w' ? '0-1' : '1-0';
  else if (chess.isDraw()) result = '1/2-1/2';

  const pgnBody = chess.pgn();
  const pgn = `[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n[Event "ABC Chess Open 2026"]\n[Round "${(gameIndex % 11) + 1}"]\n\n${pgnBody}`;

  return {
    title: `Round ${(gameIndex % 11) + 1} — ${white} vs ${black}`,
    whitePlayer: white,
    blackPlayer: black,
    pgn,
    movesJson: JSON.stringify(turns),
    createdAt: new Date(Date.now() - gameIndex * 86_400_000),
  };
}

async function main() {
  console.log(`\nSeeding test data for @${USERNAME} (${TARGET_GAMES} games)…\n`);

  const user = await prisma.user.findUnique({
    where: { username: USERNAME },
    select: { id: true, username: true, plan: true },
  });

  if (!user) {
    console.error(`✗ User "${USERNAME}" not found.`);
    process.exit(1);
  }

  const now = new Date();
  const expiry = new Date(now);
  expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
  const yearKey = String(now.getUTCFullYear());

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: 'ENTERPRISE',
      emailVerified: true,
      onboardingCompleted: true,
      userRole: 'organizer',
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      subscriptionStart: now,
      subscriptionEnd: expiry,
      subscriptionExpiresAt: expiry,
      subscriptionId: `sim_ent_${user.id.slice(0, 8)}`,
      paymentProvider: 'simulated',
      monthlyScanCount: 0,
      monthlyScanMonth: yearKey,
    },
  });
  console.log(`✓ Simulated Enterprise purchase (expires ${expiry.toISOString().slice(0, 10)})`);

  const slug = slugFromUserId(user.id);
  await prisma.organizerLibrary.upsert({
    where: { userId: user.id },
    create: {
      id: randomUUID(),
      userId: user.id,
      slug,
      title: 'ABC Chess Open 2026',
      enabled: true,
    },
    update: {
      slug,
      title: 'ABC Chess Open 2026',
      enabled: true,
    },
  });
  console.log(`✓ Organizer library ready (slug: ${slug})`);

  const existing = await prisma.savedGame.count({ where: { userId: user.id } });
  if (existing > 0) {
    await prisma.savedGame.deleteMany({ where: { userId: user.id } });
    console.log(`✓ Cleared ${existing} existing saved games (test reset)`);
  }

  let inserted = 0;
  while (inserted < TARGET_GAMES) {
    const batchCount = Math.min(BATCH_SIZE, TARGET_GAMES - inserted);
    const rows = [];
    for (let i = 0; i < batchCount; i++) {
      const game = generateAccurateGame(inserted + i);
      rows.push({
        id: randomUUID(),
        userId: user.id,
        title: game.title,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        pgn: game.pgn,
        movesJson: game.movesJson,
        createdAt: game.createdAt,
      });
    }
    await prisma.savedGame.createMany({ data: rows });
    inserted += batchCount;
    process.stdout.write(`\r  Games: ${inserted}/${TARGET_GAMES}`);
  }

  const linked = await ensurePublicLinksForUser(user.id);
  console.log(`✓ Enabled public share links for ${linked} games`);

  console.log('\n✓ Done — refresh dashboard and open /library/' + slug + '\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

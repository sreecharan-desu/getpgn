import type { Turn } from "@/components/MoveList";
import { prisma } from "@/lib/db";
import { countPliesFromTurns } from "@/lib/countPlies";
import { LEGAL } from "@/lib/legal";

const SHARE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface PublicShareGame {
  slug: string;
  title: string;
  whitePlayer: string;
  blackPlayer: string;
  pgn: string;
  movesJson: string;
  createdAt: Date;
  moveCount: number;
}

export async function getPublicShareBySlug(
  slug: string,
): Promise<PublicShareGame | null> {
  const publicLink = await prisma.publicLink.findUnique({
    where: { slug },
    select: {
      slug: true,
      enabled: true,
      game: {
        select: {
          title: true,
          whitePlayer: true,
          blackPlayer: true,
          pgn: true,
          movesJson: true,
          createdAt: true,
        },
      },
    },
  });

  if (!publicLink?.enabled || !publicLink.game) return null;

  let moveCount = 0;
  try {
    const turns = JSON.parse(publicLink.game.movesJson) as Turn[];
    if (Array.isArray(turns)) moveCount = countPliesFromTurns(turns);
  } catch {
    /* ignore malformed movesJson */
  }

  return {
    slug: publicLink.slug,
    title: publicLink.game.title,
    whitePlayer: publicLink.game.whitePlayer,
    blackPlayer: publicLink.game.blackPlayer,
    pgn: publicLink.game.pgn,
    movesJson: publicLink.game.movesJson,
    createdAt: publicLink.game.createdAt,
    moveCount,
  };
}

export function sharePageUrl(slug: string): string {
  return `${LEGAL.siteUrl}/share/${slug}`;
}

export function formatSharePublicDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${SHARE_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function displaySharePlayer(name: string, fallback: string): string {
  const trimmed = name.trim();
  return trimmed || fallback;
}

export function buildShareOgTitle(game: PublicShareGame): string {
  const title = game.title.trim();
  if (title) return title;
  const white = displaySharePlayer(game.whitePlayer, "White");
  const black = displaySharePlayer(game.blackPlayer, "Black");
  return `${white} vs ${black}`;
}

export function buildShareOgDescription(game: PublicShareGame): string {
  const white = displaySharePlayer(game.whitePlayer, "White");
  const black = displaySharePlayer(game.blackPlayer, "Black");
  const date = formatSharePublicDate(game.createdAt);
  const moveLabel =
    game.moveCount === 1 ? "1 move" : `${game.moveCount.toLocaleString("en-IN")} moves`;
  const parts = [`${white} vs ${black}`, moveLabel];
  if (date) parts.push(date);
  return `${parts.join(" · ")}. Replay this validated chess game on GetPGN.`;
}

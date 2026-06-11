import { prisma } from "@/lib/db";
import { LEGAL } from "@/lib/legal";

export interface PublicLibrary {
  slug: string;
  title: string;
  organizerUsername: string;
  gameCount: number;
}

export async function getPublicLibraryBySlug(
  slug: string,
): Promise<PublicLibrary | null> {
  const library = await prisma.organizerLibrary.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      enabled: true,
      userId: true,
      user: { select: { username: true } },
    },
  });

  if (!library?.enabled) return null;

  const gameCount = await prisma.savedGame.count({
    where: {
      userId: library.userId,
      publicLink: { enabled: true },
    },
  });

  return {
    slug: library.slug,
    title: library.title,
    organizerUsername: library.user.username,
    gameCount,
  };
}

export function libraryPageUrl(slug: string): string {
  return `${LEGAL.siteUrl}/library/${slug}`;
}

export function buildLibraryOgDescription(library: PublicLibrary): string {
  const games =
    library.gameCount === 1
      ? "1 shared game"
      : `${library.gameCount.toLocaleString("en-IN")} shared games`;
  return `${games} by @${library.organizerUsername}. Browse validated chess replays on GetPGN.`;
}

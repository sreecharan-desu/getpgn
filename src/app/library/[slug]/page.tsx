import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { LogoMessageShell } from '@/components/ui/LogoMessageShell';
import { buildPageMetadata } from '@/lib/og/metadata';
import { NOINDEX } from '@/lib/og/pages';
import {
  buildLibraryOgDescription,
  getPublicLibraryBySlug,
} from '@/lib/libraryPublic';
import {
  LIBRARY_GAMES_INITIAL_PAGE_SIZE,
  buildLibraryGamesWhere,
  libraryGamesOrderBy,
} from '@/lib/libraryGamesQuery';
import { LibraryBrowser } from '@/components/library/LibraryBrowser';
import type { LibraryGameRow } from '@/hooks/useLibraryGamesPagination';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const library = await getPublicLibraryBySlug(slug);

  if (!library) {
    return buildPageMetadata({
      title: 'Library not found',
      description: 'This organizer library is no longer available.',
      path: `/library/${slug}`,
      eyebrow: 'Organizer library',
      robots: NOINDEX,
    });
  }

  return buildPageMetadata({
    title: library.title,
    description: buildLibraryOgDescription(library),
    path: `/library/${slug}`,
    eyebrow: 'Organizer library',
    ogSubtitle: `@${library.organizerUsername}`,
    ogVariant: 'library',
    ogSlug: slug,
  });
}

export default async function OrganizerLibraryPage({ params }: PageProps) {
  const { slug } = await params;

  const library = await prisma.organizerLibrary.findUnique({
    where: { slug },
    include: {
      user: { select: { username: true } },
    },
  });

  if (!library || !library.enabled) {
    return (
      <LogoMessageShell
        eyebrow="Organizer library"
        title="Library not available"
        subtitle="This organizer library doesn't exist or sharing has been turned off."
        actions={
          <Link href="/" className="btn-primary btn-md w-full sm:w-auto sm:min-w-[9.5rem]">
            Back to home
          </Link>
        }
      />
    );
  }

  const listWhere = buildLibraryGamesWhere(library.userId, { sort: 'newest' });

  const [rows, sharedTotal] = await Promise.all([
    prisma.savedGame.findMany({
      where: listWhere,
      orderBy: [...libraryGamesOrderBy('newest')],
      take: LIBRARY_GAMES_INITIAL_PAGE_SIZE,
      select: {
        id: true,
        title: true,
        whitePlayer: true,
        blackPlayer: true,
        movesJson: true,
        createdAt: true,
        publicLink: { select: { slug: true } },
      },
    }),
    prisma.savedGame.count({ where: listWhere }),
  ]);

  const initialGames: LibraryGameRow[] = rows.map((game) => ({
    id: game.id,
    title: game.title,
    whitePlayer: game.whitePlayer,
    blackPlayer: game.blackPlayer,
    movesJson: game.movesJson,
    createdAt: game.createdAt.toISOString(),
    shareSlug: game.publicLink?.slug ?? null,
  }));

  return (
    <LibraryBrowser
      slug={library.slug}
      title={library.title}
      organizerUsername={library.user.username}
      initialGames={initialGames}
      initialTotal={sharedTotal}
    />
  );
}

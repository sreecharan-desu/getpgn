import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import ShareClient from './ShareClient';
import { LogoMessageShell } from '@/components/ui/LogoMessageShell';
import { buildPageMetadata } from '@/lib/og/metadata';
import { NOINDEX } from '@/lib/og/pages';
import {
  buildShareOgDescription,
  buildShareOgTitle,
  getPublicShareBySlug,
} from '@/lib/shareGamePublic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getPublicShareBySlug(slug);

  if (!game) {
    return buildPageMetadata({
      title: 'Game not found',
      description: 'This shared chess game is no longer available.',
      path: `/share/${slug}`,
      eyebrow: 'Shared replay',
      robots: NOINDEX,
    });
  }

  return buildPageMetadata({
    title: buildShareOgTitle(game),
    description: buildShareOgDescription(game),
    path: `/share/${slug}`,
    eyebrow: 'Validated chess replay',
    ogVariant: 'share',
    ogSlug: slug,
  });
}

export default async function SharePage({ params }: PageProps) {
  const { slug } = await params;
  const game = await getPublicShareBySlug(slug);

  if (!game) {
    return (
      <LogoMessageShell
        eyebrow="Shared replay"
        title="Game not found"
        subtitle="This shared link doesn't exist, has been turned off by its owner, or is no longer available."
        actions={
          <Link href="/" className="btn-primary btn-md w-full sm:w-auto sm:min-w-[9.5rem]">
            Back to home
          </Link>
        }
      />
    );
  }

  return (
    <ShareClient
      title={game.title}
      whitePlayer={game.whitePlayer}
      blackPlayer={game.blackPlayer}
      pgn={game.pgn}
      movesJson={game.movesJson}
      createdAt={game.createdAt.toISOString()}
    />
  );
}

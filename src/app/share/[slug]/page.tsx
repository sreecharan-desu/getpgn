import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import ShareClient from './ShareClient';
import { Logo } from '@/components/ui/Logo';
import { AlertTriangle } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SharePage({ params }: PageProps) {
  const { slug } = await params;

  const publicLink = await prisma.publicLink.findUnique({
    where: { slug },
    select: {
      enabled: true,
      game: {
        select: {
          title: true,
          pgn: true,
          movesJson: true,
          createdAt: true,
        },
      },
    },
  });

  if (!publicLink || !publicLink.enabled || !publicLink.game) {
    return (
      <div className="flex flex-col min-h-screen justify-between bg-paper text-ink">
        <header className="px-5 sm:px-6 py-3.5 bg-paper/85 backdrop-blur-md border-b border-line sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="group/logo -ml-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
            >
              <Logo showMark={false} wordmarkSize="md" />
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full border border-line-strong bg-surface text-muted">
            <AlertTriangle className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div className="mt-6 space-y-2 max-w-md">
            <h1 className="text-[24px] font-semibold tracking-tight text-ink">Game not found</h1>
            <p className="text-muted text-[13px] leading-relaxed">
              This shared link doesn&apos;t exist, has been turned off by its owner, or is no longer available.
            </p>
          </div>
          <Link href="/" className="btn-primary btn-md mt-7">
            Back to home
          </Link>
        </main>

        <footer className="border-t border-line bg-paper px-5 py-5 text-center text-[12px] text-muted-2">
          <p>
            © {new Date().getFullYear()} GetPGN — Chess scoresheet digitizer
          </p>
          <p className="mt-2 text-muted">
            <a href="/privacy" className="legal-link">Privacy</a>
            {" · "}
            <a href="/refund" className="legal-link">Refunds</a>
          </p>
        </footer>
      </div>
    );
  }

  const { game } = publicLink;

  return (
    <ShareClient
      title={game.title}
      pgn={game.pgn}
      movesJson={game.movesJson}
      createdAt={game.createdAt.toISOString()}
    />
  );
}

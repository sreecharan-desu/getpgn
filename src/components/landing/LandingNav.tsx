"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="GetPGN home"
          className="group/logo -ml-1.5 shrink-0 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
        >
          <Logo wordmarkSize="md" />
        </Link>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/signup"
            prefetch
            className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-ink pl-4 pr-3.5 text-[13px] font-medium tracking-[-0.01em] text-paper transition-all hover:bg-ink-soft active:scale-[0.98]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

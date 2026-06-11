"use client";

import React from "react";
import Link from "next/link";
import {
  ScanLine,
  ShieldCheck,
  PenLine,
  Wand2,
  Download,
  Share2,
  History,
  ArrowRight,
  Check,
  Upload,
  Sparkles,
  Infinity as InfinityIcon,
  Lock,
  LayoutGrid,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { FREE_SCAN_LIMIT } from "@/components/dashboard/FreePlanUI";
import { LandingNav } from "@/components/landing/LandingNav";
import { HomeHero } from "@/components/landing/HomeHero";
import { HomeVideoSection } from "@/components/landing/HomeVideoSection";
import { PricingSectionContent } from "@/components/pricing/PricingSectionContent";

const FREE_FEATURES = [
  {
    icon: ScanLine,
    title: "AI scoresheet extraction",
    desc: "Photograph handwritten scoresheets — Gemini reads every move with confidence scores.",
  },
  {
    icon: ShieldCheck,
    title: "Live move validation",
    desc: "Each move is checked on a real board in your browser. Illegal moves are flagged, never blocked.",
  },
  {
    icon: PenLine,
    title: "Inline editing & repair",
    desc: "Fix misreads in the move sheet or drag pieces on the board — validation updates instantly.",
  },
  {
    icon: Wand2,
    title: "Smart suggestions",
    desc: "Ambiguous notation gets legal-move candidates so you can pick the right continuation.",
  },
  {
    icon: Download,
    title: "PGN export",
    desc: "Copy clean notation or download a tournament-ready .pgn from every session.",
  },
  {
    icon: Upload,
    title: `${FREE_SCAN_LIMIT} free scans`,
    desc: "Try the full digitizing flow twice — no credit card, no setup friction.",
  },
] as const;

const PRO_FEATURES = [
  { icon: InfinityIcon, label: "Pro: ₹100/mo · 100 scans or ₹1,000/yr · 1,000 scans" },
  { icon: History, label: "Cloud library with board previews" },
  { icon: Share2, label: "Shareable interactive replays" },
  { icon: LayoutGrid, label: "5 board color themes" },
  { icon: Sparkles, label: "Enterprise: pay-as-you-go packs from ₹4,000" },
] as const;

const STEPS = [
  { n: "01", title: "Upload", desc: "Drop a photo of your handwritten scoresheet.", icon: Upload },
  { n: "02", title: "Review", desc: "AI extracts moves; you validate and fix on the board.", icon: ShieldCheck },
  { n: "03", title: "Export", desc: "Copy or download PGN — save to your library on Pro.", icon: Download },
] as const;

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <PricingSectionContent />
      </div>
    </section>
  );
}

export default function GetPGNLandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <LandingNav />
      <HomeHero />
      <HomeVideoSection />

      {/* How it works */}
      <section id="how-it-works" className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">How it works</p>
            <h2 className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-ink">
              Three steps to a clean PGN
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              From messy handwriting to tournament-ready notation — review on the board, export when you&apos;re
              happy.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ n, title, desc, icon: Icon }, i) => (
              <li
                key={n}
                className="relative rounded-[20px] border border-line bg-paper p-6 gp-lift"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-paper gp-nums">
                  {n}
                </span>
                <Icon className="mb-3 h-5 w-5 text-muted-2" strokeWidth={1.75} />
                <h3 className="text-[16px] font-bold text-ink">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">Features</p>
              <h2 className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-ink">
                Everything your scoresheet needs
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Try the full digitizing flow with 2 free scans. Pro adds your library and share links.
                Enterprise customers can buy pay-as-you-go scan packs and publish a public game library.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 text-[12px] text-muted">
              <Lock className="h-3.5 w-3.5" />
              Library &amp; themes are Pro
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <article
                key={title}
                className="group rounded-[20px] border border-line bg-surface p-6 transition-colors hover:border-line-strong hover:bg-paper gp-lift"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-line-strong bg-paper text-ink transition-colors group-hover:border-ink">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </div>
                <h3 className="text-[15px] font-bold tracking-tight text-ink">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{desc}</p>
              </article>
            ))}
          </div>

          {/* Pro highlight strip */}
          <div className="relative mt-10 overflow-hidden rounded-[24px] bg-ink px-6 py-8 sm:px-8 sm:py-9">
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/50">Pro unlocks</p>
                <h3 className="mt-2 text-[22px] font-extrabold tracking-tight text-paper">
                  Never lose a game again
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-paper/65">
                  Pro from ₹100/mo or ₹1,000/yr. Enterprise pay-as-you-go packs from ₹4,000 — add credits anytime.
                </p>
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:gap-x-8">
                {PRO_FEATURES.map(({ label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-[13px] text-paper/85">
                    <Check className="h-4 w-4 shrink-0 text-paper/60" strokeWidth={2.5} />
                    {label}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                prefetch
                className="shrink-0 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-paper px-6 text-[14px] font-bold text-ink transition-all hover:bg-surface active:scale-[0.98]"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Final CTA */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 py-16 text-center sm:px-8 lg:flex-row lg:justify-between lg:py-20 lg:text-left">
          <div className="max-w-xl">
            <h2 className="text-[clamp(1.5rem,2.5vw,2.25rem)] font-extrabold tracking-[-0.03em] text-ink">
              Built by chess players, for chess players.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Chessground, chess.js validation, and modern AI — everything you need to archive every tournament
              game.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" prefetch className="btn-primary btn-lg">
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" prefetch className="btn-secondary btn-lg">
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-5 py-8 sm:px-8">
          <p className="max-w-xl text-center text-[12px] leading-relaxed text-muted sm:text-left">
            Your scoresheets and games are stored securely in your private account.
            We never sell your data or share it with third parties.{" "}
            <Link href="/privacy" prefetch className="legal-link">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/terms" prefetch className="legal-link">
              Terms
            </Link>
            {" · "}
            <Link href="/refund" prefetch className="legal-link">
              Refund Policy
            </Link>
          </p>
          <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group/logo inline-flex rounded-lg transition-opacity hover:opacity-90"
          >
            <Logo wordmarkSize="sm" />
          </Link>
            <span className="text-[12px] text-muted-2">Chess scoresheet digitizer</span>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-muted"
            aria-label="Footer"
          >
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-ink">
              Pricing
            </a>
            <Link href="/privacy" prefetch className="legal-link">
              Privacy
            </Link>
            <Link href="/terms" prefetch className="legal-link">
              Terms
            </Link>
            <Link href="/refund" prefetch className="legal-link">
              Refunds
            </Link>
            <Link href="/login" prefetch className="transition-colors hover:text-ink">
              Log in
            </Link>
          </nav>
          <p className="font-mono text-[11px] text-muted-2">
            © {new Date().getFullYear()} GetPGN
          </p>
          </div>
        </div>
        <div className="border-t border-line/40">
          <div className="mx-auto w-full max-w-6xl px-5 py-3 sm:px-8">
            <p className="text-center text-[11px] text-muted-2 sm:text-right">
              Built by Chess Coaches. Powered by ABCChess Education LLP.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

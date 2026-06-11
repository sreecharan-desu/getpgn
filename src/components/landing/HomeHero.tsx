"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { FREE_SCAN_LIMIT } from "@/components/dashboard/FreePlanUI";
import { getHomepageShowcaseConfig } from "@/lib/homepageConfig";

export function HomeHero() {
  const { pgnOutputImageUrl } = getHomepageShowcaseConfig();

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-paper"
        aria-hidden="true"
      />

      <div className="relative pt-16 sm:pt-20 lg:pt-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="sm:mx-auto lg:mr-auto">
            <div className="chip mb-6 w-fit landing-fade-up">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              Built for tournament chess
            </div>

            <h1 className="landing-fade-up landing-fade-up-delay-1 mt-2 max-w-3xl text-balance text-[clamp(2.5rem,6vw,3.75rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-ink md:text-6xl lg:mt-4">
              Scoresheets to PGN,
              <span className="text-muted-2"> instantly.</span>
            </h1>

            <p className="landing-fade-up landing-fade-up-delay-2 mt-6 max-w-2xl text-pretty text-[clamp(16px,2vw,18px)] leading-relaxed text-muted">
              Photograph a handwritten scoresheet and get a validated, export-ready PGN in
              seconds — AI extraction, live board validation, and smart repair built in.
            </p>

            <div className="landing-fade-up landing-fade-up-delay-3 mt-10 flex flex-wrap items-center gap-3">
              <div className="rounded-[14px] border border-line bg-paper p-0.5">
                <Link href="/login" prefetch className="btn-primary btn-lg rounded-xl px-6">
                  Start digitizing free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <Link href="#pricing" className="btn-secondary btn-lg rounded-xl px-6">
                See pricing
              </Link>
            </div>

            <div className="landing-fade-up landing-fade-up-delay-3 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted-2">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-positive" strokeWidth={2.5} />
                {FREE_SCAN_LIMIT} free scans
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-positive" strokeWidth={2.5} />
                No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Cancel Pro anytime
              </span>
            </div>
          </div>
        </div>

        <div
          className="landing-fade-up landing-fade-up-delay-3 relative mt-10 overflow-hidden px-2 sm:mt-14 md:mt-16 lg:mt-20"
          style={{ animationDelay: "0.35s" }}
        >
          <div className="landing-product-frame relative mx-auto max-w-6xl overflow-hidden rounded-2xl p-3 sm:rounded-[1.25rem] sm:p-4 lg:rounded-[1.5rem] lg:p-5">
            <div className="landing-hero-product-shot relative aspect-[15/8] w-full overflow-hidden rounded-xl sm:rounded-2xl">
              <Image
                src={pgnOutputImageUrl}
                alt="GetPGN dashboard — validated moves, board replay, and exported PGN"
                fill
                unoptimized
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 1152px"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

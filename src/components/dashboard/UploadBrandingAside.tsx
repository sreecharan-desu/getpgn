"use client";

import React from "react";
import { BookOpen, Sparkles, Upload } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { QueenMascot } from "@/components/ui/QueenMascot";

const STEPS = [
  { icon: Upload, label: "Snap or upload your scoresheet" },
  { icon: Sparkles, label: "AI reads every move" },
  { icon: BookOpen, label: "Review, save, and share" },
] as const;

export function UploadBrandingAside({ className = "" }: { className?: string }) {
  return (
    <section
      className={`gp-upload-brand-panel relative overflow-hidden rounded-[20px] border border-line/45 gp-fade-up ${className}`}
      aria-label="About GetPGN"
    >
      <div className="gp-upload-brand-panel__backdrop" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[min(28rem,70vh)] flex-col items-center justify-center px-6 py-10 text-center sm:px-10 sm:py-14">
        <QueenMascot interactive className="!max-w-[148px]" />
        <div className="mt-6">
          <Logo wordmarkSize="lg" showMark={false} />
        </div>
        <p className="mt-3 max-w-[18rem] text-[14px] leading-relaxed text-muted">
          Handwritten scoresheets → validated games → clean PGN export.
        </p>
        <ul className="mt-8 w-full max-w-[19rem] space-y-3 text-left">
          {STEPS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-[13px] text-muted">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/[0.06] text-ink">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-2">
          Trusted by club players &amp; organizers
        </p>
      </div>
    </section>
  );
}

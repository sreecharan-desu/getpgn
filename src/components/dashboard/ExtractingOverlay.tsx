"use client";

import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ScanLine } from "lucide-react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/bodyScrollLock";

const CHESS_PIECES = ["♔", "♕", "♖", "♗", "♘", "♙"] as const;

const STEPS = [
  {
    short: "Read",
    line: "Reading your scoresheet…",
    hint: "Decoding every handwritten line",
  },
  {
    short: "Extract",
    line: "Extracting moves with AI…",
    hint: "Turning handwriting into notation",
  },
  {
    short: "Validate",
    line: "Checking moves on a live board…",
    hint: "Making sure every move is legal",
  },
  {
    short: "Ready",
    line: "Preparing your review workspace…",
    hint: "Almost there — hang tight",
  },
] as const;

const TIPS = [
  "Good lighting helps the AI read your handwriting",
  "We flag uncertain moves — you never lose control",
  "Your scoresheet stays private during extraction",
] as const;

/** Ambient floating squares — chess board texture in the background */
const AMBIENT = [
  { x: "8%", y: "12%", size: 48, delay: 0 },
  { x: "82%", y: "18%", size: 36, delay: 0.8 },
  { x: "14%", y: "72%", size: 40, delay: 1.2 },
  { x: "78%", y: "68%", size: 52, delay: 0.4 },
  { x: "45%", y: "8%", size: 28, delay: 1.6 },
  { x: "52%", y: "82%", size: 32, delay: 0.2 },
] as const;

interface ExtractingOverlayProps {
  loadingStep: number;
  chessPieceIndex: number;
  reduceMotion: boolean;
}

export function ExtractingOverlay({
  loadingStep,
  chessPieceIndex,
  reduceMotion,
}: ExtractingOverlayProps) {
  const stepIndex = Math.min(loadingStep, STEPS.length - 1);
  const step = STEPS[stepIndex];
  const progress = Math.min(94, 12 + loadingStep * 22 + 8);
  const piece = CHESS_PIECES[chessPieceIndex % CHESS_PIECES.length];
  const tip = TIPS[stepIndex % TIPS.length];

  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  const ambientSquares = useMemo(
    () =>
      AMBIENT.map(({ x, y, size, delay }, i) => (
        <span
          key={i}
          aria-hidden
          className={reduceMotion ? "absolute rounded-md" : "extracting-float absolute rounded-md"}
          style={{
            left: x,
            top: y,
            width: size,
            height: size,
            animationDelay: `${delay}s`,
            background: i % 2 === 0 ? "var(--extract-square-light)" : "var(--extract-square-dark)",
          }}
        />
      )),
    [reduceMotion],
  );

  const overlay = (
    <div
      className="extracting-screen fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden px-8 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Digitizing scoresheet"
    >
      {ambientSquares}

      {/* Center stage */}
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <div
          className="relative grid h-[7.5rem] w-[7.5rem] place-items-center rounded-[1.75rem]"
          style={{ boxShadow: `0 0 0 1px var(--extract-ring), 0 24px 64px var(--extract-glow)` }}
        >
          {!reduceMotion && (
            <span
              className="extracting-orbit pointer-events-none absolute inset-[-18px] rounded-full border border-dashed opacity-40"
              style={{ borderColor: "var(--extract-ring)" }}
              aria-hidden
            />
          )}

          <span
            className="absolute inset-0 rounded-[1.75rem] opacity-50"
            style={{
              background:
                "radial-gradient(circle at 30% 25%, var(--extract-glow), transparent 65%)",
            }}
            aria-hidden
          />

          <AnimatePresence mode="wait">
            <motion.span
              key={piece}
              initial={reduceMotion ? false : { scale: 0.7, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={reduceMotion ? undefined : { scale: 0.85, opacity: 0, rotate: 12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`select-none text-[3.25rem] leading-none ${reduceMotion ? "" : "extracting-piece-pop"}`}
              aria-hidden
            >
              {piece}
            </motion.span>
          </AnimatePresence>

          <span
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
            aria-hidden
          >
            <ScanLine className="h-4 w-4" />
          </span>
        </div>

        {/* Step pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {STEPS.map(({ short }, i) => {
            const active = i === stepIndex;
            const done = i < stepIndex;
            return (
              <span
                key={short}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
                  active
                    ? "bg-[var(--extract-bar)] text-[var(--extract-on-bar)]"
                    : done
                      ? "border border-transparent bg-[var(--extract-track)] text-[var(--extract-muted)]"
                      : "border border-[var(--extract-ring)] text-[var(--extract-faint)]"
                }`}
              >
                {short}
              </span>
            );
          })}
        </div>
      </div>

      <h3 className="relative z-10 text-[1.35rem] font-bold tracking-tight sm:text-2xl">
        Digitizing scoresheet
      </h3>

      <AnimatePresence mode="wait">
        <motion.p
          key={step.line}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 mt-2 max-w-sm text-[15px] font-medium"
          style={{ color: "var(--extract-muted)" }}
        >
          {step.line}
        </motion.p>
      </AnimatePresence>

      <p
        className="relative z-10 mt-1 text-[13px]"
        style={{ color: "var(--extract-faint)" }}
      >
        {step.hint}
      </p>

      <div className="relative z-10 mt-10 w-full max-w-sm">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wide">
          <span style={{ color: "var(--extract-faint)" }}>Progress</span>
          <span className="gp-nums" style={{ color: "var(--extract-muted)" }}>
            {progress}%
          </span>
        </div>
        <div
          className={`relative h-1.5 overflow-hidden rounded-full ${reduceMotion ? "" : "extracting-shimmer"}`}
          style={{ background: "var(--extract-track)" }}
        >
          <motion.div
            className="relative h-full rounded-full"
            style={{ background: "var(--extract-bar)" }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.65, ease: [0.16, 1, 0.3, 1] }
            }
          />
        </div>
        <p
          className="mt-4 text-[12px] leading-relaxed"
          style={{ color: "var(--extract-faint)" }}
        >
          {tip}
        </p>
      </div>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}

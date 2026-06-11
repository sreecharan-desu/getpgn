"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
} from "lucide-react";
import type { ReplayPlaybackControls } from "@/hooks/useReplayPlayback";

type ReplayControlsProps = ReplayPlaybackControls & {
  currentPlyIndex: number;
  totalPlies: number;
  variant?: "panel" | "overlay";
  className?: string;
  showPlay?: boolean;
};

const navBtnClass =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-line bg-paper/90 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30";

export function ReplayControls({
  currentPlyIndex,
  totalPlies,
  isPlaying,
  playSpeed,
  setPlaySpeed,
  togglePlay,
  handleFirst,
  handlePrev,
  handleNext,
  handleLast,
  variant = "panel",
  className = "",
  showPlay = true,
}: ReplayControlsProps) {
  if (variant === "overlay") {
    return (
      <div
        className={`pointer-events-auto border-t border-line/70 bg-paper/95 px-3 py-2.5 backdrop-blur-sm ${className}`}
      >
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted gp-nums">
          <span>
            {currentPlyIndex} / {totalPlies}
          </span>
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            aria-label="Playback speed"
            className="h-7 cursor-pointer appearance-none rounded-md border border-line bg-paper px-2 pr-6 text-[11px] font-medium text-ink outline-none"
          >
            <option value={500}>0.5s</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
          </select>
        </div>
        <div className="mt-1.5 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={handleFirst}
            disabled={currentPlyIndex === 0}
            className={navBtnClass}
            aria-label="First"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPlyIndex === 0}
            className={navBtnClass}
            aria-label="Previous"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={totalPlies === 0}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-ink text-paper transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentPlyIndex === totalPlies}
            className={navBtnClass}
            aria-label="Next"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleLast}
            disabled={currentPlyIndex === totalPlies}
            className={navBtnClass}
            aria-label="Last"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2.5 border-b border-line bg-surface px-4 py-3 ${className}`}
    >
      <div className="flex items-center justify-between text-[12px] text-muted gp-nums">
        <span>
          Position {currentPlyIndex} / {totalPlies}
        </span>
        {showPlay ? (
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            aria-label="Playback speed"
            className="h-8 min-w-[6.5rem] cursor-pointer appearance-none rounded-lg border border-line bg-paper px-2.5 text-[12px] font-medium text-ink outline-none transition-colors hover:border-muted-2 focus:border-ink"
          >
            <option value={500}>Fast · 0.5s</option>
            <option value={1000}>Normal · 1s</option>
            <option value={2000}>Slow · 2s</option>
          </select>
        ) : null}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-ink transition-all duration-200"
          style={{
            width: totalPlies ? `${(currentPlyIndex / totalPlies) * 100}%` : "0%",
          }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={handleFirst}
          disabled={currentPlyIndex === 0}
          className={navBtnClass}
          aria-label="First"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPlyIndex === 0}
          className={navBtnClass}
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {showPlay ? (
          <button
            type="button"
            onClick={togglePlay}
            disabled={totalPlies === 0}
            className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              isPlaying
                ? "bg-ink text-paper hover:bg-ink-soft"
                : "border border-line bg-paper text-ink hover:bg-surface-2"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Play
              </>
            )}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPlyIndex === totalPlies}
          className={navBtnClass}
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleLast}
          disabled={currentPlyIndex === totalPlies}
          className={navBtnClass}
          aria-label="Last"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Search, X } from "lucide-react";

type GamesLibrarySearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  className?: string;
};

/** Search bar styled like the public organizer library page. */
export function GamesLibrarySearchBar({
  value,
  onChange,
  placeholder = "Search games, players, moves…",
  compact = false,
  className = "",
}: GamesLibrarySearchBarProps) {
  return (
    <div className={`relative w-full min-w-0 shrink-0 ${className}`}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search saved games"
        className={`w-full rounded-xl border border-line bg-surface/50 pl-10 pr-10 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-muted-2 focus:border-line-strong focus:bg-paper focus:outline-none focus:ring-2 focus:ring-ink/8 ${
          compact ? "h-10 text-[12px]" : "h-11 text-[13px]"
        }`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Spinner } from "@/components/ui/Spinner";
import BoardThumbnail from "@/components/ui/BoardThumbnail";
import {
  InfiniteScrollSentinel,
  shouldLoadMoreFromScroll,
} from "@/components/dashboard/InfiniteScrollSentinel";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useLibraryGamesPagination,
  type LibraryGameRow,
} from "@/hooks/useLibraryGamesPagination";
import type { LibrarySort } from "@/lib/libraryGamesQuery";

type ViewMode = "list" | "grid";

export type LibraryBrowserProps = {
  slug: string;
  title: string;
  organizerUsername: string;
  initialGames: LibraryGameRow[];
  initialTotal: number;
};

function formatGameDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function LibraryBrowser({
  slug,
  title,
  organizerUsername,
  initialGames,
  initialTotal,
}: LibraryBrowserProps) {
  const [searchInput, setSearchInput] = useState("");
  const [playerInput, setPlayerInput] = useState("");
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const debouncedPlayer = useDebouncedValue(playerInput, 400);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      player: debouncedPlayer,
      sort,
    }),
    [debouncedSearch, debouncedPlayer, sort],
  );

  const isSearchPending =
    searchInput.trim() !== debouncedSearch.trim() ||
    playerInput.trim() !== debouncedPlayer.trim();

  const {
    games,
    total,
    hasMore,
    loadingMore,
    searchLoading,
    loadMore,
  } = useLibraryGamesPagination({
    slug,
    initialGames,
    initialTotal,
    filters,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || loadingMore || searchLoading || isSearchPending) return;
      if (shouldLoadMoreFromScroll(e.currentTarget)) {
        void loadMore();
      }
    },
    [hasMore, loadingMore, searchLoading, isSearchPending, loadMore],
  );

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    Boolean(playerInput.trim()) ||
    sort !== "newest";

  const clearFilters = () => {
    setSearchInput("");
    setPlayerInput("");
    setSort("newest");
  };

  const busy = searchLoading || isSearchPending;

  return (
    <div className="flex h-dvh max-h-dvh flex-col bg-paper text-ink">
      <header className="shrink-0 border-b border-line/80 bg-paper/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
          >
            <Logo wordmarkSize="md" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-[12px] text-muted sm:inline">
              Organizer library
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth [scrollbar-gutter:stable]"
      >
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-2">
              @{organizerUsername}
            </p>
            <h1 className="mt-2 text-[clamp(1.65rem,3vw,2.25rem)] font-bold tracking-[-0.03em] text-ink">
              {title}
            </h1>
            <p className="mt-2 text-[13px] text-muted">
              {total.toLocaleString("en-IN")} shared game{total === 1 ? "" : "s"}
              {hasMore || games.length < total
                ? ` · showing ${games.length.toLocaleString("en-IN")}`
                : ""}
            </p>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search games, players, moves…"
                aria-label="Search library games"
                className="h-11 w-full rounded-xl border border-line bg-surface/50 pl-10 pr-10 text-[13px] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-muted-2 focus:border-line-strong focus:bg-paper focus:outline-none focus:ring-2 focus:ring-ink/8"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? "border-ink/20 bg-ink text-paper"
                    : "border-line bg-surface/50 text-ink hover:bg-surface-2"
                }`}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-paper/20 px-1 text-[10px] font-bold">
                    !
                  </span>
                ) : null}
              </button>

              <div className="flex h-11 items-center rounded-xl border border-line bg-surface/50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-paper text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-paper text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {showFilters ? (
            <div className="mb-5 rounded-2xl border border-line/80 bg-surface/40 p-4 sm:p-5 gp-fade-up">
              <div className="flex flex-wrap items-end gap-4">
                <label className="min-w-[12rem] flex-1 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">
                    Player name
                  </span>
                  <input
                    type="text"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    placeholder="Filter by white or black…"
                    className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[13px] text-ink placeholder:text-muted-2 focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-ink/8"
                  />
                </label>
                <fieldset className="space-y-1.5">
                  <legend className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">
                    Sort
                  </legend>
                  <div className="flex gap-2">
                    {(["newest", "oldest"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSort(option)}
                        className={`rounded-xl border px-3.5 py-2 text-[12px] font-semibold capitalize transition-colors ${
                          sort === option
                            ? "border-ink bg-ink text-paper"
                            : "border-line bg-paper text-muted hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 rounded-xl border border-line px-3.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-muted">
              <Spinner size={16} />
              Searching…
            </div>
          ) : games.length === 0 ? (
            <div className="rounded-2xl border border-line/80 bg-surface/30 px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-ink">No games found</p>
              <p className="mt-1.5 text-[13px] text-muted">
                {hasActiveFilters
                  ? "Try a different search or clear your filters."
                  : "No shared games in this library yet."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border border-line bg-paper px-4 py-2 text-[12px] font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : viewMode === "list" ? (
            <ul className="overflow-hidden rounded-2xl border border-line/80 bg-paper shadow-[var(--shadow-soft)]">
              {games.map((game) => (
                <LibraryGameListRow key={game.id} game={game} />
              ))}
            </ul>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {games.map((game) => (
                <LibraryGameCard key={game.id} game={game} />
              ))}
            </ul>
          )}

          {!busy && games.length > 0 ? (
            <InfiniteScrollSentinel
              hasMore={hasMore}
              loading={loadingMore}
              onLoadMore={loadMore}
              scrollRootRef={scrollRef}
              className="py-6"
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function LibraryGameListRow({ game }: { game: LibraryGameRow }) {
  const white = game.whitePlayer || "White";
  const black = game.blackPlayer || "Black";

  return (
    <li className="group border-b border-line/60 last:border-b-0 transition-colors hover:bg-surface/50">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="shrink-0 overflow-hidden rounded-lg ring-1 ring-line">
            <BoardThumbnail
              movesJson={game.movesJson}
              size={52}
              aria-label={`Board preview for ${game.title}`}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[14px] tracking-[-0.01em] text-ink">
              {game.title}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
              <span className="truncate">
                {white} <span className="text-muted-2">vs</span> {black}
              </span>
              <span className="text-muted-2">·</span>
              <span className="inline-flex items-center gap-1 gp-nums">
                <CalendarDays className="h-3 w-3 shrink-0" />
                {formatGameDate(game.createdAt)}
              </span>
            </p>
          </div>
        </div>
        {game.shareSlug ? (
          <Link
            href={`/share/${game.shareSlug}`}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-paper px-3.5 py-2 text-[12px] font-semibold text-ink transition-all hover:border-line-strong hover:bg-surface group-hover:shadow-sm sm:ml-2"
          >
            View replay
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function LibraryGameCard({ game }: { game: LibraryGameRow }) {
  const white = game.whitePlayer || "White";
  const black = game.blackPlayer || "Black";

  return (
    <li className="group rounded-2xl border border-line/80 bg-paper p-3 shadow-[var(--shadow-soft)] transition-all hover:border-line-strong hover:shadow-md sm:p-4">
      <div className="mx-auto w-full max-w-[9.5rem]">
        <BoardThumbnail
          movesJson={game.movesJson}
          size={152}
          className="w-full"
          aria-label={`Board preview for ${game.title}`}
        />
      </div>
      <p className="mt-3 line-clamp-2 font-semibold text-[13px] leading-snug tracking-[-0.01em] text-ink sm:text-[14px]">
        {game.title}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted">
        {white} <span className="text-muted-2">vs</span> {black}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted gp-nums">
        <CalendarDays className="h-3 w-3 shrink-0" />
        {formatGameDate(game.createdAt)}
      </p>
      {game.shareSlug ? (
        <Link
          href={`/share/${game.shareSlug}`}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-[12px] font-bold text-paper transition-colors hover:bg-ink-soft"
        >
          View replay
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </li>
  );
}

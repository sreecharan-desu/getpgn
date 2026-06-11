"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIBRARY_GAMES_PAGE_SIZE } from "@/lib/libraryGamesQuery";
import type { LibrarySort } from "@/lib/libraryGamesQuery";
import { cursorFromGame } from "@/lib/savedGamesQuery";

export type LibraryGameRow = {
  id: string;
  title: string;
  whitePlayer: string;
  blackPlayer: string;
  movesJson: string | null;
  createdAt: string;
  shareSlug: string | null;
};

export type LibraryFilters = {
  search: string;
  player: string;
  sort: LibrarySort;
};

type GamesPageResponse = {
  games?: LibraryGameRow[];
  total?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  error?: string;
};

function filtersKey(filters: LibraryFilters): string {
  return `${filters.search}|${filters.player}|${filters.sort}`;
}

function isDefaultFilters(filters: LibraryFilters): boolean {
  return (
    !filters.search.trim() &&
    !filters.player.trim() &&
    filters.sort === "newest"
  );
}

export function useLibraryGamesPagination(opts: {
  slug: string;
  initialGames: LibraryGameRow[];
  initialTotal: number;
  filters: LibraryFilters;
}) {
  const { slug, initialGames, initialTotal, filters } = opts;

  const [games, setGames] = useState<LibraryGameRow[]>(initialGames);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialGames.length < initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const nextCursorRef = useRef<string | null>(
    initialGames.length > 0 ? cursorFromGame(initialGames[initialGames.length - 1]!) : null,
  );
  const activeFiltersRef = useRef(filtersKey(filters));
  const fetchGenRef = useRef(0);
  const loadInFlightRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const mountedRef = useRef(false);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchPage = useCallback(
    async (mode: "more" | "search", f: LibraryFilters, cursor: string | null) => {
      const gen = ++fetchGenRef.current;
      const params = new URLSearchParams({
        limit: String(LIBRARY_GAMES_PAGE_SIZE),
        sort: f.sort,
      });
      if (mode === "more" && cursor) params.set("cursor", cursor);
      if (f.search.trim()) params.set("search", f.search.trim());
      if (f.player.trim()) params.set("player", f.player.trim());

      const res = await fetch(`/api/library/${encodeURIComponent(slug)}/games?${params}`);
      const data = (await res.json()) as GamesPageResponse;
      if (gen !== fetchGenRef.current) return null;
      if (!res.ok) throw new Error(data.error || "Could not load games.");

      return data;
    },
    [slug],
  );

  useEffect(() => {
    const key = filtersKey(filters);

    if (!mountedRef.current) {
      mountedRef.current = true;
      activeFiltersRef.current = key;
      if (isDefaultFilters(filters)) return;
    }

    if (key === activeFiltersRef.current) return;
    activeFiltersRef.current = key;

    setSearchLoading(true);
    void (async () => {
      try {
        const data = await fetchPage("search", filters, null);
        if (!data) return;
        const rows = data.games ?? [];
        setGames(rows);
        setTotal(data.total ?? rows.length);
        const more = Boolean(data.hasMore);
        setHasMore(more);
        hasMoreRef.current = more;
        nextCursorRef.current =
          data.nextCursor ?? (rows.length ? cursorFromGame(rows[rows.length - 1]!) : null);
      } catch {
        /* keep prior list */
      } finally {
        setSearchLoading(false);
      }
    })();
  }, [fetchPage, filters]);

  const loadMore = useCallback(async () => {
    if (loadInFlightRef.current || searchLoading || !hasMoreRef.current) return;

    loadInFlightRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage("more", filters, nextCursorRef.current);
      if (!data) return;
      const rows = data.games ?? [];
      if (!rows.length) {
        setHasMore(false);
        hasMoreRef.current = false;
        return;
      }

      let added = 0;
      setGames((prev) => {
        const seen = new Set(prev.map((g) => g.id));
        const merged = [...prev];
        for (const row of rows) {
          if (!seen.has(row.id)) {
            merged.push(row);
            added++;
          }
        }
        return merged;
      });

      nextCursorRef.current =
        data.nextCursor ?? cursorFromGame(rows[rows.length - 1]!);

      if (added === 0) {
        if (!data.hasMore) {
          setHasMore(false);
          hasMoreRef.current = false;
        }
        return;
      }

      setTotal(data.total ?? total);
      const more = Boolean(data.hasMore);
      setHasMore(more);
      hasMoreRef.current = more;
    } catch {
      /* ignore */
    } finally {
      loadInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, filters, searchLoading, total]);

  return {
    games,
    total,
    hasMore,
    loadingMore,
    searchLoading,
    loadMore,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAVED_GAMES_PAGE_SIZE, cursorFromGame } from "@/lib/savedGamesQuery";
import type { SearchableSavedGame } from "@/lib/savedGameSearch";

export type PaginatedSavedGame = SearchableSavedGame & {
  pgn?: string;
};

type GamesPageResponse = {
  games?: PaginatedSavedGame[];
  total?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  error?: string;
};

function initialGamesKey(games: PaginatedSavedGame[]): string {
  return games.map((g) => g.id).join(",");
}

export function useSavedGamesPagination(opts: {
  initialGames: PaginatedSavedGame[];
  initialTotal: number;
  enabled: boolean;
  /** Already debounced — API runs when this changes. */
  searchQuery: string;
}) {
  const { initialGames, initialTotal, enabled, searchQuery } = opts;

  const [games, setGames] = useState<PaginatedSavedGame[]>(initialGames);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(
    enabled && initialGames.length < initialTotal,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const nextCursorRef = useRef<string | null>(
    initialGames.length > 0 ? cursorFromGame(initialGames[initialGames.length - 1]!) : null,
  );
  const activeQueryRef = useRef(searchQuery);
  const fetchGenRef = useRef(0);
  const skipInitialFetchRef = useRef(true);
  const loadInFlightRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const hasPaginatedRef = useRef(false);
  const initialKeyRef = useRef(initialGamesKey(initialGames));

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const applyInitialSnapshot = useCallback(() => {
    setGames(initialGames);
    setTotal(initialTotal);
    const more = enabled && initialGames.length < initialTotal;
    setHasMore(more);
    hasMoreRef.current = more;
    nextCursorRef.current =
      initialGames.length > 0
        ? cursorFromGame(initialGames[initialGames.length - 1]!)
        : null;
    hasPaginatedRef.current = false;
  }, [enabled, initialGames, initialTotal]);

  useEffect(() => {
    const nextKey = initialGamesKey(initialGames);
    if (nextKey === initialKeyRef.current) {
      setTotal(initialTotal);
      return;
    }
    initialKeyRef.current = nextKey;
    applyInitialSnapshot();
  }, [applyInitialSnapshot, initialGames, initialTotal]);

  const fetchPage = useCallback(
    async (mode: "more" | "search", query: string, cursor: string | null) => {
      const gen = ++fetchGenRef.current;
      const params = new URLSearchParams({
        limit: String(SAVED_GAMES_PAGE_SIZE),
      });
      if (mode === "more" && cursor) params.set("cursor", cursor);
      if (query.trim()) params.set("search", query.trim());

      const res = await fetch(`/api/games/save?${params.toString()}`);
      const data = (await res.json()) as GamesPageResponse;
      if (gen !== fetchGenRef.current) return null;
      if (!res.ok) throw new Error(data.error || "Could not load games.");

      return data;
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;

    const q = searchQuery.trim();
    if (skipInitialFetchRef.current && q === "") {
      skipInitialFetchRef.current = false;
      return;
    }
    skipInitialFetchRef.current = false;

    if (q === activeQueryRef.current.trim()) return;
    activeQueryRef.current = q;
    hasPaginatedRef.current = false;

    setSearchLoading(true);
    void (async () => {
      try {
        const data = await fetchPage("search", q, null);
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
        /* keep prior list on search failure */
      } finally {
        setSearchLoading(false);
      }
    })();
  }, [enabled, fetchPage, searchQuery]);

  const loadMore = useCallback(async () => {
    if (!enabled || loadInFlightRef.current || searchLoading || !hasMoreRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage("more", searchQuery.trim(), nextCursorRef.current);
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

      const nextCursor =
        data.nextCursor ?? cursorFromGame(rows[rows.length - 1]!);
      nextCursorRef.current = nextCursor;

      if (added === 0) {
        if (!data.hasMore) {
          setHasMore(false);
          hasMoreRef.current = false;
        }
        return;
      }

      hasPaginatedRef.current = true;
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
  }, [enabled, fetchPage, searchLoading, searchQuery, total]);

  return {
    games,
    setGames,
    total,
    setTotal,
    hasMore,
    loadingMore,
    searchLoading,
    loadMore,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ORGANIZER_PURCHASES_PAGE_SIZE,
  cursorFromOrganizerPurchase,
} from "@/lib/organizerPurchasesQuery";

export type OrganizerPurchaseRow = {
  id: string;
  scansPurchased: number;
  amount: number;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: string;
  completedAt: string | null;
};

type PurchasesPageResponse = {
  purchases?: OrganizerPurchaseRow[];
  total?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  error?: string;
};

function initialPurchasesKey(purchases: OrganizerPurchaseRow[]): string {
  return purchases.map((p) => p.id).join(",");
}

export function useOrganizerPurchasesPagination(opts: {
  initialPurchases: OrganizerPurchaseRow[];
  initialTotal: number;
  enabled: boolean;
}) {
  const { initialPurchases, initialTotal, enabled } = opts;

  const [purchases, setPurchases] =
    useState<OrganizerPurchaseRow[]>(initialPurchases);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(
    enabled && initialPurchases.length < initialTotal,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursorRef = useRef<string | null>(
    initialPurchases.length > 0
      ? cursorFromOrganizerPurchase(
          initialPurchases[initialPurchases.length - 1]!,
        )
      : null,
  );
  const loadInFlightRef = useRef(false);
  const hasMoreRef = useRef(hasMore);
  const initialKeyRef = useRef(initialPurchasesKey(initialPurchases));

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    const nextKey = initialPurchasesKey(initialPurchases);
    if (nextKey === initialKeyRef.current) {
      setTotal(initialTotal);
      return;
    }
    initialKeyRef.current = nextKey;
    setPurchases(initialPurchases);
    setTotal(initialTotal);
    const more = enabled && initialPurchases.length < initialTotal;
    setHasMore(more);
    hasMoreRef.current = more;
    nextCursorRef.current =
      initialPurchases.length > 0
        ? cursorFromOrganizerPurchase(
            initialPurchases[initialPurchases.length - 1]!,
          )
        : null;
  }, [enabled, initialPurchases, initialTotal]);

  const fetchPage = useCallback(async (cursor: string | null) => {
    const params = new URLSearchParams({
      limit: String(ORGANIZER_PURCHASES_PAGE_SIZE),
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/organizer/purchases?${params.toString()}`);
    const data = (await res.json()) as PurchasesPageResponse;
    if (!res.ok) {
      throw new Error(data.error || "Could not load purchase history.");
    }
    return data;
  }, []);

  const loadMore = useCallback(async () => {
    if (!enabled || loadInFlightRef.current || !hasMoreRef.current) return;

    loadInFlightRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage(nextCursorRef.current);
      const rows = data.purchases ?? [];
      if (!rows.length) {
        setHasMore(false);
        hasMoreRef.current = false;
        return;
      }

      let added = 0;
      setPurchases((prev) => {
        const seen = new Set(prev.map((p) => p.id));
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
        data.nextCursor ??
        cursorFromOrganizerPurchase(rows[rows.length - 1]!);

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
      /* keep prior list on failure */
    } finally {
      loadInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [enabled, fetchPage, total]);

  return {
    purchases,
    total,
    hasMore,
    loadingMore,
    loadMore,
  };
}

"use client";

import React, { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/Spinner";

type InfiniteScrollSentinelProps = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** Scroll container; when omitted, uses the viewport. */
  scrollRootRef?: React.RefObject<HTMLElement | null>;
  className?: string;
};

const MAX_PREFETCH_WHEN_SHORT = 3;

/** Footer at the end of a paginated list — loads more when visible. */
export function InfiniteScrollSentinel({
  hasMore,
  loading,
  onLoadMore,
  scrollRootRef,
  className = "",
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const loadingRef = useRef(loading);
  const hasMoreRef = useRef(hasMore);
  const prefetchCountRef = useRef(0);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    prefetchCountRef.current = 0;
  }, [scrollRootRef]);

  const tryLoadMore = () => {
    if (!hasMoreRef.current || loadingRef.current) return;
    onLoadMoreRef.current();
  };

  // IntersectionObserver — stay connected while loading; guard in callback.
  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const root = scrollRootRef?.current ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          tryLoadMore();
        }
      },
      { root, rootMargin: "160px 0px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, scrollRootRef]);

  // Scroll on the list container — reliable when sentinel stays in view after a load.
  useEffect(() => {
    const root = scrollRootRef?.current;
    if (!root) return;

    const onScroll = () => {
      if (!hasMoreRef.current || loadingRef.current) return;
      if (shouldLoadMoreFromScroll(root)) {
        tryLoadMore();
      }
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [scrollRootRef, hasMore]);

  // If the list is shorter than its container, prefetch a few pages — capped.
  useEffect(() => {
    if (!hasMore || loading) return;
    const root = scrollRootRef?.current;
    if (!root) return;
    if (prefetchCountRef.current >= MAX_PREFETCH_WHEN_SHORT) return;
    if (root.scrollHeight > root.clientHeight + 8) return;

    prefetchCountRef.current += 1;
    const timer = window.setTimeout(() => {
      if (!hasMoreRef.current || loadingRef.current) return;
      onLoadMoreRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasMore, loading, scrollRootRef]);

  if (!hasMore && !loading) return null;

  return (
    <div
      ref={sentinelRef}
      className={`flex items-center justify-center py-3 ${className}`}
      aria-hidden={!loading}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2 text-[11px] text-muted">
          <Spinner size={14} />
          Loading more…
        </span>
      ) : (
        <span className="h-1 w-full" aria-hidden="true" />
      )}
    </div>
  );
}

/** Call from an overflow container's onScroll when near the bottom. */
export function shouldLoadMoreFromScroll(
  el: HTMLElement,
  thresholdPx = 140,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
}

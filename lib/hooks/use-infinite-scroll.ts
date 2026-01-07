"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>;
  pageSize?: number;
  initialData?: T[];
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  refresh: () => void;
  sentinelRef: (node: HTMLElement | null) => void;
}

/**
 * Hook for infinite scroll pagination
 * Uses Intersection Observer for automatic loading
 */
export function useInfiniteScroll<T>({
  fetchFn,
  pageSize = 20,
  initialData = [],
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>(initialData);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelNodeRef = useRef<HTMLElement | null>(null);

  // Fetch data for a specific page
  const fetchPage = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (isRefresh) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const result = await fetchFn(pageNum, pageSize);

        if (isRefresh) {
          setItems(result.data);
        } else {
          setItems((prev) => [...prev, ...result.data]);
        }

        setHasMore(result.hasMore);
        setPage(pageNum);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [fetchFn, pageSize]
  );

  // Initial load
  useEffect(() => {
    if (initialData.length === 0) {
      fetchPage(1, true);
    }
  }, []);

  // Load more items
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPage(page + 1);
    }
  }, [fetchPage, loadingMore, hasMore, page]);

  // Refresh (reload from page 1)
  const refresh = useCallback(() => {
    setPage(1);
    fetchPage(1, true);
  }, [fetchPage]);

  // Sentinel ref callback for Intersection Observer
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      sentinelNodeRef.current = node;

      if (!node || !hasMore) return;

      // Create new observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMore();
          }
        },
        { rootMargin: "200px" } // Start loading before sentinel is visible
      );

      observerRef.current.observe(node);
    },
    [hasMore, loadingMore, loadMore]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    sentinelRef,
  };
}


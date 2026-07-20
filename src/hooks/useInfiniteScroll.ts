'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions<T> {
  /** Initial items already loaded */
  initialItems: T[];
  /** How many items to load per page */
  pageSize?: number;
  /** Function to fetch more items. Returns null/empty when no more. */
  fetchMore?: (page: number, pageSize: number) => Promise<T[]>;
  /** Threshold for intersection observer (0-1) */
  threshold?: number;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  sentinelRef: (node: HTMLElement | null) => void;
  reset: () => void;
}

/**
 * Hook for infinite scroll pagination using Intersection Observer.
 * Falls back to showing all initial items if no fetchMore is provided.
 */
export function useInfiniteScroll<T>({
  initialItems,
  pageSize = 8,
  fetchMore,
  threshold = 0.1,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelNodeRef = useRef<HTMLElement | null>(null);

  // If no fetchMore, paginate from initialItems locally
  const isLocalPagination = !fetchMore;

  useEffect(() => {
    if (isLocalPagination) {
      const visibleCount = page * pageSize;
      setItems(initialItems.slice(0, visibleCount));
      setHasMore(visibleCount < initialItems.length);
    }
  }, [page, pageSize, initialItems, isLocalPagination]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    if (isLocalPagination) {
      setPage((p) => p + 1);
      return;
    }

    if (fetchMore) {
      setIsLoading(true);
      try {
        const newItems = await fetchMore(page + 1, pageSize);
        if (!newItems || newItems.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => [...prev, ...newItems]);
          setPage((p) => p + 1);
          if (newItems.length < pageSize) {
            setHasMore(false);
          }
        }
      } catch {
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isLoading, hasMore, isLocalPagination, fetchMore, page, pageSize]);

  // Setup Intersection Observer
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !hasMore) return;

      sentinelNodeRef.current = node;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMore();
          }
        },
        { threshold },
      );

      observerRef.current.observe(node);
    },
    [hasMore, loadMore, threshold],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const reset = useCallback(() => {
    setItems(isLocalPagination ? initialItems.slice(0, pageSize) : initialItems);
    setPage(1);
    setHasMore(true);
    setIsLoading(false);
  }, [initialItems, isLocalPagination, pageSize]);

  return {
    items,
    isLoading,
    hasMore,
    sentinelRef,
    reset,
  };
}

'use client';

import { useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ar-recently-viewed';
const MAX_ITEMS = 20;

/**
 * Hook to track recently viewed products in localStorage.
 * Used by the recommendations engine.
 */
export function useRecentlyViewed() {
  const trackView = useCallback((productId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const items: string[] = stored ? JSON.parse(stored) : [];
      const updated = [productId, ...items.filter((id) => id !== productId)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, []);

  const getRecentlyViewed = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const clear = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  return { trackView, getRecentlyViewed, clear };
}

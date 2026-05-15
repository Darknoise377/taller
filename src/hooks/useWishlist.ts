import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'wr_wishlist';

function readStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [items, setItems] = useState<string[]>([]);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setItems(readStorage());
  }, []);

  const toggle = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  const isLiked = useCallback(
    (productId: string) => items.includes(productId),
    [items]
  );

  return { items, toggle, isLiked };
}

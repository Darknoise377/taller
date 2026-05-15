"use client";
// src/hooks/useCsrf.ts
// Returns a helper that adds the CSRF token to fetch options automatically.

import { useCallback, useEffect, useRef } from "react";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? (match.split("=")[1] ?? null) : null;
}

/**
 * Returns a `csrfFetch` wrapper that automatically includes the CSRF token
 * header on every request. Fetches a new token from /api/csrf on first use
 * if the cookie is not yet set.
 *
 * Usage:
 *   const { csrfFetch } = useCsrf();
 *   const res = await csrfFetch("/api/auth/login", { method: "POST", ... });
 */
export function useCsrf() {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Prime the CSRF cookie if not already set
    if (!readCsrfCookie()) {
      fetch("/api/csrf").catch(() => {/* silent */});
    }
  }, []);

  const csrfFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      let token = readCsrfCookie() ?? tokenRef.current;

      if (!token) {
        // Fetch a fresh token
        const res = await fetch("/api/csrf");
        const data = (await res.json()) as { csrfToken: string };
        token = data.csrfToken;
        tokenRef.current = token;
      }

      const headers = new Headers(init.headers);
      headers.set(CSRF_HEADER_NAME, token);

      return fetch(input, { ...init, headers });
    },
    []
  );

  return { csrfFetch };
}

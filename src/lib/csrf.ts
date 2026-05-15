// src/lib/csrf.ts
// Double-submit cookie CSRF protection.
// - Server sets a non-httpOnly cookie `csrf-token` with a random value.
// - Client reads the cookie and sends it as the `x-csrf-token` header.
// - Server validates that header === cookie value.

export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/** Generate a cryptographically random CSRF token. */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Validate that the header value matches the cookie value. */
export function validateCsrfToken(
  cookieValue: string | undefined,
  headerValue: string | null
): boolean {
  if (!cookieValue || !headerValue) return false;
  // Constant-time comparison to prevent timing attacks
  if (cookieValue.length !== headerValue.length) return false;
  let result = 0;
  for (let i = 0; i < cookieValue.length; i++) {
    result |= cookieValue.charCodeAt(i) ^ headerValue.charCodeAt(i);
  }
  return result === 0;
}

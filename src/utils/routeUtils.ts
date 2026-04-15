export function isCheckoutPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

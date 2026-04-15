export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const withProtocol = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return withProtocol.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function getBaseUrlAsUrl(): URL {
  return new URL(getBaseUrl());
}

// src/app/api/csrf/route.ts
// GET /api/csrf — issues a CSRF token cookie and returns the token in JSON.
// Call this once on app load (or before the first mutation).

import { NextResponse } from "next/server";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

export async function GET() {
  const token = generateCsrfToken();

  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false, // Must be readable by JS (double-submit pattern)
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  return res;
}

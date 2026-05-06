// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: CUSTOMER_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { COOKIE_NAME } from "@/config/admin";

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ADMIN LOGOUT ERROR]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

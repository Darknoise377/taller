import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/config/admin";

export async function POST() {
  try {
    const cookieStore = await cookies();

    // 🔑 Destruir cookie
    cookieStore.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });

    console.log("🚪 Sesión cerrada, cookie destruida:", COOKIE_NAME);

    return NextResponse.json({ message: "Logout exitoso" });
  } catch (err) {
    console.error("[LOGOUT ERROR]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
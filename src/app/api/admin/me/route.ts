import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { COOKIE_NAME } from "@/config/admin";
import { verifyAdminToken } from "@/lib/auth";
import type { AdminSessionUser } from "@/types/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const payload = await verifyAdminToken(token);
    const user: AdminSessionUser = {
      id: payload.uid,
      email: payload.sub,
      role: payload.role,
      name: payload.name,
    };

    return NextResponse.json({ user });
  } catch {
    // Cookie invalid/expired: allow client to clear local state.
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";
import { verifyCustomerToken, customerTokenPayloadToUser } from "@/lib/auth/jwt";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const payload = await verifyCustomerToken(token);
    return NextResponse.json({ user: customerTokenPayloadToUser(payload) });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

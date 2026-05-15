// src/app/api/cuenta/verificar-compra/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/auth/jwt";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId")?.trim();

  if (!productId) {
    return NextResponse.json({ error: "productId requerido" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ purchased: false, authenticated: false });
  }

  let payload;
  try {
    payload = await verifyCustomerToken(token);
  } catch {
    return NextResponse.json({ purchased: false, authenticated: false });
  }

  // Check if this customer has a completed order containing the product
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { userId: payload.uid },
        { customerEmail: payload.sub },
      ],
      status: { in: ["APPROVED", "SHIPPED"] },
      products: {
        some: { productId },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ purchased: !!order, authenticated: true });
}

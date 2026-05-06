// src/app/api/cuenta/pedidos/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/auth/jwt";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyCustomerToken(token);
  } catch {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { userId: payload.uid },
        { customerEmail: payload.sub },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      products: {
        include: { product: { select: { id: true, name: true, imageUrl: true } } },
      },
    },
  });

  return NextResponse.json(orders);
}

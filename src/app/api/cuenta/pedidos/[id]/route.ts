// src/app/api/cuenta/pedidos/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/auth/jwt";
import { CUSTOMER_COOKIE_NAME } from "@/config/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

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

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [
        { userId: payload.uid },
        { customerEmail: payload.sub },
      ],
    },
    include: {
      products: {
        include: {
          product: {
            select: { id: true, name: true, imageUrl: true, slug: true },
          },
        },
      },
      orderCombos: {
        include: {
          combo: {
            select: { id: true, name: true, imageUrl: true, slug: true },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  return NextResponse.json(order);
}

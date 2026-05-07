import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { sendOrderCreatedEmail } from "@/lib/email/orderEmails";
import { rateLimit } from "@/lib/rateLimit";

const REF_RE = /^[a-zA-Z0-9_\-]{1,120}$/;
const TX_RE  = /^[a-zA-Z0-9_\-]{1,100}$/;

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { keyPrefix: "wompi-update-order", windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  let body: { transactionId?: unknown; referenceCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const transactionId =
    typeof body.transactionId === "string" ? body.transactionId.trim() : null;
  const referenceCode =
    typeof body.referenceCode === "string" ? body.referenceCode.trim() : null;

  if (!transactionId || !TX_RE.test(transactionId)) {
    return NextResponse.json({ error: "transactionId inválido" }, { status: 400 });
  }
  if (!referenceCode || !REF_RE.test(referenceCode)) {
    return NextResponse.json({ error: "referenceCode inválido" }, { status: 400 });
  }

  // Buscar la orden con sus productos
  const order = await prisma.order.findUnique({
    where: { referenceCode },
    include: {
      products: {
        include: { product: { select: { name: true, price: true } } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  if (order.paymentMethod !== PaymentMethod.WOMPI) {
    return NextResponse.json({ error: "Esta orden no corresponde a Wompi" }, { status: 400 });
  }

  // Si ya fue aprobada, retornar directamente
  if (order.status === OrderStatus.APPROVED) {
    return NextResponse.json({ status: order.status, alreadyFinal: true });
  }

  // ── Verificar con la API de Wompi server-side ──────────────────────────────
  const isProduction = process.env.NEXT_PUBLIC_WOMPI_ENV === "production";
  const wompiBase = isProduction
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";

  const privateKey = process.env.WOMPI_PRIVATE_KEY ?? "";
  const fetchHeaders: HeadersInit = privateKey
    ? { Authorization: `Bearer ${privateKey}` }
    : {};

  let txData: Record<string, unknown>;
  try {
    const wompiRes = await fetch(`${wompiBase}/transactions/${transactionId}`, {
      headers: fetchHeaders,
      cache: "no-store",
    });
    if (!wompiRes.ok) {
      return NextResponse.json(
        { error: "Transacción no encontrada en Wompi" },
        { status: 502 }
      );
    }
    const payload = await wompiRes.json();
    txData = (payload?.data ?? {}) as Record<string, unknown>;
  } catch (err) {
    console.error("❌ Error llamando API Wompi:", err);
    return NextResponse.json({ error: "Error al verificar transacción" }, { status: 502 });
  }

  const txStatus = typeof txData.status === "string" ? txData.status : "";
  const amountInCents = Number(txData.amount_in_cents ?? 0);

  // Validar monto
  const expectedCents = Math.round(Number(order.total) * 100);
  if (amountInCents > 0 && amountInCents !== expectedCents) {
    console.error(
      `❌ Diferencia de monto para ${referenceCode}: esperado ${expectedCents}, recibido ${amountInCents}`
    );
    return NextResponse.json({ error: "Diferencia de monto detectada" }, { status: 422 });
  }

  // Mapear estado
  let newStatus: OrderStatus;
  switch (txStatus.toUpperCase()) {
    case "APPROVED":
      newStatus = OrderStatus.APPROVED;
      break;
    case "DECLINED":
    case "ERROR":
    case "VOIDED":
      newStatus = OrderStatus.DECLINED;
      break;
    default:
      // PENDING u otro estado: guardar transactionId sin cambiar estado
      if (!order.transactionId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { transactionId },
        });
      }
      return NextResponse.json({ status: "PENDING" });
  }

  // Persistir en DB
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: newStatus,
      transactionId,
      rawResponse: txData as object,
    },
  });

  console.log(`✅ update-order: ${referenceCode} → ${newStatus}`);

  // Enviar email de confirmación si fue aprobado
  if (newStatus === OrderStatus.APPROVED) {
    try {
      await sendOrderCreatedEmail({
        referenceCode: order.referenceCode,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        total: Number(order.total),
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        status: newStatus,
        products: order.products.map((item) => ({
          quantity: item.quantity,
          product: {
            name: item.product?.name ?? "",
            price: Number(item.product?.price ?? 0),
          },
        })),
        address: order.address,
        city: order.city,
        department: order.department ?? undefined,
        phone: order.phone,
      });
    } catch (emailErr) {
      console.error("❌ Error enviando email de confirmación:", emailErr);
    }
  }

  return NextResponse.json({ status: newStatus });
}

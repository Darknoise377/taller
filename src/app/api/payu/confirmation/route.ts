// src/app/api/payu/confirmation/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";   // ✅ Correcto para tu helper
import { OrderStatus } from "@prisma/client"; // ✅ Enums desde Prisma
import crypto from "crypto";
import { sendOrderStatusChangedEmail } from "@/lib/email/orderEmails";
import { shouldApplyIncomingOrderStatus } from "@/lib/orders/status";

function normalizePayuValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.replace(",", ".").trim();
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  // PayU suele firmar con 1 decimal (ej. number_format(TX_VALUE, 1, '.', ''))
  return value.toFixed(1);
}

function safeEquals(a: string, b: string): boolean {
  // Comparación resistente a timing (best-effort)
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Convertimos FormData a un objeto plano
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = String(value);
    });

    const referenceCode = body["reference_sale"];
    const transactionId = body["transaction_id"];
    const state = body["state_pol"];
    const currency = body["currency"];
    const merchantIdFromPayu = body["merchant_id"] ?? body["merchantId"];
    const payuSignature = (body["sign"] ?? body["signature"] ?? "").toLowerCase();
    const valueFromPayuRaw = body["value"] ?? body["TX_VALUE"] ?? body["amount"];
    const valueFromPayu = normalizePayuValue(valueFromPayuRaw);

    if (!referenceCode || !state) {
      return NextResponse.json(
        { error: "Invalid confirmation payload" },
        { status: 400 }
      );
    }

    // Variables desde .env
    const merchantId = process.env.PAYU_MERCHANT_ID;
    const apiKey = process.env.PAYU_API_KEY;

    if (!merchantId || !apiKey) {
      return NextResponse.json({ error: "PayU not configured" }, { status: 500 });
    }

    // Validar merchant id (si viene en payload)
    if (merchantIdFromPayu && merchantIdFromPayu !== merchantId) {
      return NextResponse.json({ error: "Invalid merchant" }, { status: 400 });
    }

    // Cargar orden y validar monto/moneda
    const order = await prisma.order.findUnique({
      where: { referenceCode },
      select: {
        id: true,
        total: true,
        currency: true,
        status: true,
        transactionId: true,
        referenceCode: true,
        customerName: true,
        customerEmail: true,
        paymentMethod: true,
        products: {
          select: {
            quantity: true,
            product: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!currency || currency !== order.currency) {
      return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
    }

    if (!valueFromPayu) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const expectedAmount = Number(order.total).toFixed(1);
    if (valueFromPayu !== expectedAmount) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Verificar firma
    if (!payuSignature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${valueFromPayu}~${currency}~${state}`;
    const expectedSignature = crypto.createHash("md5").update(signatureString).digest("hex");
    if (!safeEquals(payuSignature, expectedSignature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 🔹 Mapear estados de PayU a tu enum de Prisma
    let newStatus: OrderStatus = OrderStatus.PENDING;

    switch (state) {
      case "4": // Aprobada
        newStatus = OrderStatus.APPROVED;
        break;
      case "6": // Rechazada
        newStatus = OrderStatus.DECLINED;
        break;
      case "7": // Pendiente
        newStatus = OrderStatus.PENDING;
        break;
      default:
        newStatus = OrderStatus.PENDING;
    }

    const isDuplicateNotification =
      typeof transactionId === "string" &&
      transactionId.length > 0 &&
      order.transactionId === transactionId &&
      order.status === newStatus;

    if (isDuplicateNotification) {
      return new Response("OK", { status: 200 });
    }

    const canUpdateStatus = shouldApplyIncomingOrderStatus(order.status, newStatus);
    await prisma.order.update({
      where: { referenceCode },
      data: {
        ...(canUpdateStatus ? { status: newStatus } : {}),
        transactionId,
        signature: payuSignature,
        rawResponse: body, // ✅ válido como JSON
      },
    });

    console.log(
      `✅ Orden ${referenceCode} actualizada. Estado previo: ${order.status}, nuevo solicitado: ${newStatus}, aplicado: ${canUpdateStatus}`
    );

    if (canUpdateStatus) {
      try {
        await sendOrderStatusChangedEmail({
          order: {
            referenceCode: order.referenceCode,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: order.total,
            currency: order.currency,
            paymentMethod: order.paymentMethod,
            status: newStatus,
            products: order.products,
          },
          previousStatus: order.status,
          newStatus,
        });
      } catch (mailError) {
        console.error("Error enviando email de cambio de estado:", mailError);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error en confirmation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

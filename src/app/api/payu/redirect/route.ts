// src/app/api/payu/redirect/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma"; // ✅ Import correcto

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Use referenceCode (UUID) instead of sequential orderId to prevent IDOR
    const ref = searchParams.get("ref");

    if (!ref || typeof ref !== 'string' || ref.length < 10) {
      return NextResponse.json({ error: "Referencia de orden inválida" }, { status: 400 });
    }

    // 🔑 Variables desde .env
    const merchantId = process.env.PAYU_MERCHANT_ID;
    const accountId = process.env.PAYU_ACCOUNT_ID;
    const apiKey = process.env.PAYU_API_KEY;
    const responseUrl = process.env.PAYU_RESPONSE_URL;
    const confirmationUrl = process.env.PAYU_CONFIRMATION_URL;
    const checkoutUrl = process.env.PAYU_CHECKOUT_URL;
    const testMode = process.env.PAYU_TEST_MODE === "1" ? "1" : "0";

    if (!merchantId || !accountId || !apiKey || !responseUrl || !confirmationUrl || !checkoutUrl) {
      return NextResponse.json({ error: "PayU no está configurado correctamente" }, { status: 500 });
    }

    // 🔹 Buscar la orden real en DB por referenceCode (UUID)
    const order = await prisma.order.findUnique({
      where: { referenceCode: ref },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // ✅ Usamos el referenceCode (uuid), no el id numérico
    const referenceCode = order.referenceCode;
    const amount = order.total.toFixed(1); // redondeado a 1 decimal
    const currency = order.currency;

    // 🔹 Preparar firma digital con referenceCode
    const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`;
    const signature = crypto.createHash("md5").update(signatureString).digest("hex");

    // 🔹 Formulario HTML autoenviado a PayU (sandbox)
    const htmlForm = `
      <html>
        <body onload="document.forms[0].submit()">
          <form method="post" action="${escapeHtml(checkoutUrl)}">
            <input name="merchantId"    type="hidden" value="${escapeHtml(merchantId)}">
            <input name="accountId"     type="hidden" value="${escapeHtml(accountId)}">
            <input name="description"   type="hidden" value="Compra en TALLER DE MOTOS A&R">
            <input name="referenceCode" type="hidden" value="${escapeHtml(referenceCode)}">
            <input name="amount"        type="hidden" value="${escapeHtml(amount)}">
            <input name="tax"           type="hidden" value="0">
            <input name="taxReturnBase" type="hidden" value="0">
            <input name="currency"      type="hidden" value="${escapeHtml(currency)}">
            <input name="signature"     type="hidden" value="${escapeHtml(signature)}">
            <input name="test"          type="hidden" value="${testMode}">
            <input name="buyerEmail"    type="hidden" value="${escapeHtml(order.customerEmail)}">
            <input name="responseUrl"   type="hidden" value="${escapeHtml(responseUrl)}">
            <input name="confirmationUrl" type="hidden" value="${escapeHtml(confirmationUrl)}">
            <noscript>
              <p>Redirigiendo a PayU... <button type="submit">Pagar</button></p>
            </noscript>
          </form>
        </body>
      </html>
    `;

    return new NextResponse(htmlForm, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("❌ Error en redirect a PayU:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

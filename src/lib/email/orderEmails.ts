import { Resend } from "resend";
import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── Resend client ────────────────────────────────────────────────────────────

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Taller de Motos A&R <noreply@tallerar.com>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "";
const internalBcc = (process.env.EMAIL_INTERNAL_TO ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// ── Types ────────────────────────────────────────────────────────────────────

type OrderProductLine = {
  quantity: number;
  product: {
    name: string;
    price: number;
  };
};

export type BaseOrderForEmail = {
  referenceCode: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  products: OrderProductLine[];
  address?: string;
  city?: string;
  department?: string;
  phone?: string;
};

type QueuedEmailJob = {
  id: string;
  type: "ORDER_CREATED" | "ORDER_STATUS_CHANGED";
  payload: BaseOrderForEmail | StatusChangedPayload;
  attempts: number;
  lastError?: string;
  createdAt: string;
};

type StatusChangedPayload = {
  order: BaseOrderForEmail;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function paymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case "PAYU": return "PayU";
    case "WOMPI": return "Wompi";
    default: return "Contraentrega";
  }
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

function waUrl(referenceCode: string, customerName: string, phone?: string): string {
  const number = (WHATSAPP_NUMBER || phone || "").replace(/\D/g, "");
  if (!number) return "";
  const msg = encodeURIComponent(
    `¡Hola! Quiero obtener más detalles de mi pedido 🔧\nPedido: #${referenceCode.slice(0, 8).toUpperCase()}\nCliente: ${customerName}`
  );
  return `https://wa.me/${number}?text=${msg}`;
}

function productRowsHtml(products: OrderProductLine[], currency: string): string {
  return products
    .map(
      (p) =>
        `<tr>
          <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">${esc(p.product.name)}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:14px;color:#475569;">${p.quantity}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:14px;color:#0f172a;">${formatMoney(p.product.price * p.quantity, currency)}</td>
        </tr>`
    )
    .join("");
}

function stepsHtml(paymentMethod: PaymentMethod): string {
  const steps =
    paymentMethod === "CONTRAENTREGA"
      ? [
          { emoji: "✅", label: "Pedido registrado", done: true },
          { emoji: "📞", label: "Confirmar por WhatsApp", done: false },
          { emoji: "🚚", label: "Envío en camino", done: false },
          { emoji: "💳", label: "Paga al recibir", done: false },
        ]
      : [
          { emoji: "✅", label: "Pago confirmado", done: true },
          { emoji: "📦", label: "Preparando tu pedido", done: false },
          { emoji: "🚚", label: "Envío en camino", done: false },
          { emoji: "🎉", label: "¡Entregado!", done: false },
        ];

  return steps
    .map(
      (s, i) => `
      <div style="display:flex;align-items:center;gap:12px;${i < steps.length - 1 ? "margin-bottom:14px;" : ""}">
        <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;text-align:center;line-height:36px;background:${s.done ? "linear-gradient(135deg,#0A2A66,#2E5FA7)" : "#e2e8f0"};">
          ${s.done ? `<span style="font-size:16px;">${s.emoji}</span>` : `<span style="font-size:13px;color:#94a3b8;">${i + 1}</span>`}
        </div>
        <p style="margin:0;font-size:14px;font-weight:${s.done ? "600" : "400"};color:${s.done ? "#0f172a" : "#94a3b8"};">${s.label}</p>
      </div>`
    )
    .join("");
}

function buildConfirmationEmail(order: BaseOrderForEmail): string {
  const isContraentrega = order.paymentMethod === "CONTRAENTREGA";
  const whatsappUrl = waUrl(order.referenceCode, order.customerName, order.phone);

  const shippingBlock =
    order.address || order.city
      ? `<div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:12px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#0f172a;">📍 Dirección de envío</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            <strong>${esc(order.customerName)}</strong><br>
            ${[order.address, order.city, order.department].filter((v): v is string => Boolean(v)).map(esc).join(", ")}<br>
            ${order.phone ? `Tel: ${esc(order.phone)}` : ""}
          </p>
        </div>`
      : "";

  const waBlock = whatsappUrl
    ? `<div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-radius:16px;padding:24px 28px;text-align:center;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#166534;">¿Quieres más detalles de tu pedido?</p>
        <p style="margin:0 0 16px;font-size:13px;color:#166534;">Envío, código de seguimiento y estado — todo por WhatsApp.</p>
        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer"
           style="display:inline-flex;align-items:center;gap:10px;background:#25D366;color:white;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:600;">
          Contactar por WhatsApp
        </a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#0A2A66,#2E5FA7);width:60px;height:60px;border-radius:50%;line-height:60px;margin-bottom:14px;text-align:center;">
      <span style="color:white;font-weight:800;font-size:18px;">A&amp;R</span>
    </div>
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;">TALLER DE MOTOS A&amp;R</p>
    <h1 style="margin:0;font-size:24px;font-weight:700;color:#0f172a;">${isContraentrega ? "¡Pedido registrado!" : "¡Gracias por tu compra!"}</h1>
    <p style="margin:8px 0 0;color:#64748b;font-size:14px;">${isContraentrega ? "Hemos registrado tu pedido con pago contraentrega." : "Tu pago fue confirmado. ¡Pronto tendrás tu pedido!"}</p>
  </div>
  <div style="background:white;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:8px;">
      <div>
        <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Número de pedido</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#0A2A66;">#${esc(order.referenceCode.slice(0, 8).toUpperCase())}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Método de pago</p>
        <p style="margin:4px 0 0;font-size:14px;color:#0f172a;">${paymentMethodLabel(order.paymentMethod)}</p>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="border-bottom:2px solid #e2e8f0;">
          <th style="padding:8px 6px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;">Producto</th>
          <th style="padding:8px 6px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;">Cant.</th>
          <th style="padding:8px 6px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${productRowsHtml(order.products, order.currency)}</tbody>
    </table>
    <div style="border-top:2px solid #e2e8f0;padding-top:14px;text-align:right;">
      <span style="font-size:14px;color:#64748b;">Total: </span>
      <span style="font-size:22px;font-weight:700;color:#0A2A66;">${formatMoney(order.total, order.currency)}</span>
    </div>
    ${shippingBlock}
  </div>
  <div style="background:white;border-radius:16px;padding:24px 28px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:20px;">
    <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:#0f172a;">¿Qué sigue con tu pedido?</p>
    ${stepsHtml(order.paymentMethod)}
  </div>
  ${waBlock}
  <div style="text-align:center;color:#94a3b8;font-size:12px;">
    <p style="margin:0;">Puedes responder a este correo y te atenderemos con gusto.</p>
    <p style="margin:10px 0 0;">© ${new Date().getFullYear()} Taller de Motos A&amp;R.</p>
  </div>
</div>
</body>
</html>`;
}

function buildStatusEmail(params: StatusChangedPayload): string {
  const { order, newStatus, trackingNumber, trackingUrl } = params;
  const statusMap: Record<string, { label: string; color: string; emoji: string }> = {
    APPROVED:  { label: "Aprobado",   color: "#22c55e", emoji: "✅" },
    SHIPPED:   { label: "Enviado",    color: "#3b82f6", emoji: "🚚" },
    DECLINED:  { label: "Rechazado",  color: "#ef4444", emoji: "❌" },
    CANCELLED: { label: "Cancelado",  color: "#6b7280", emoji: "🚫" },
    PENDING:   { label: "Pendiente",  color: "#f59e0b", emoji: "⏳" },
  };
  const s = statusMap[newStatus] ?? { label: newStatus, color: "#64748b", emoji: "📋" };

  const trackingBlock = trackingNumber
    ? `<div style="margin-top:20px;padding:16px;background:#eff6ff;border-radius:12px;border-left:4px solid #3b82f6;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e40af;">🚚 Información de envío</p>
        <p style="margin:0;font-size:14px;color:#1e3a5f;">Número de guía: <strong>${esc(trackingNumber)}</strong></p>
        ${trackingUrl ? `<p style="margin:8px 0 0;"><a href="${esc(trackingUrl)}" style="color:#3b82f6;font-weight:600;">Rastrear mi pedido →</a></p>` : ""}
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:linear-gradient(135deg,#0A2A66,#2E5FA7);width:60px;height:60px;border-radius:50%;line-height:60px;margin-bottom:14px;text-align:center;">
      <span style="color:white;font-weight:800;font-size:18px;">A&amp;R</span>
    </div>
    <h1 style="margin:0;font-size:24px;color:#0f172a;">Actualización de tu pedido</h1>
  </div>
  <div style="background:white;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center;">
    <p style="font-size:16px;color:#475569;">Hola <strong>${esc(order.customerName)}</strong>,</p>
    <p style="font-size:16px;color:#475569;">Tu pedido <strong>#${esc(order.referenceCode.slice(0, 8).toUpperCase())}</strong> fue actualizado:</p>
    <div style="display:inline-block;margin:20px 0;padding:12px 32px;border-radius:50px;background:${s.color}15;border:2px solid ${s.color};">
      <span style="font-size:20px;font-weight:700;color:${s.color};">${s.emoji} ${s.label}</span>
    </div>
    ${trackingBlock}
  </div>
  <div style="text-align:center;margin-top:24px;color:#94a3b8;font-size:12px;">
    <p>© ${new Date().getFullYear()} Taller de Motos A&amp;R.</p>
  </div>
</div>
</body>
</html>`;
}

// ── Queue (persistencia en rawResponse JSON) ──────────────────────────────────

function cryptoRandomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseQueuedEmails(rawResponse: Prisma.JsonValue | null): QueuedEmailJob[] {
  if (!rawResponse || typeof rawResponse !== "object" || Array.isArray(rawResponse)) return [];
  const rawQueue = (rawResponse as Record<string, unknown>).emailQueue;
  if (!Array.isArray(rawQueue)) return [];
  return rawQueue.filter((item): item is QueuedEmailJob => {
    if (!item || typeof item !== "object") return false;
    const m = item as Partial<QueuedEmailJob>;
    return Boolean(m.id && m.type && m.payload && m.createdAt);
  });
}

async function persistQueuedEmails(referenceCode: string, queue: QueuedEmailJob[]): Promise<void> {
  const order = await prisma.order.findUnique({ where: { referenceCode }, select: { rawResponse: true } });
  if (!order) return;
  const base =
    order.rawResponse && typeof order.rawResponse === "object" && !Array.isArray(order.rawResponse)
      ? (order.rawResponse as Record<string, unknown>)
      : {};
  await prisma.order.update({
    where: { referenceCode },
    data: { rawResponse: { ...base, emailQueue: queue } as Prisma.InputJsonValue },
  });
}

async function enqueueFailedEmail(
  referenceCode: string,
  job: Omit<QueuedEmailJob, "attempts" | "createdAt">,
  errorMessage: string
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { referenceCode }, select: { rawResponse: true } });
  if (!order) return;
  const queue = parseQueuedEmails(order.rawResponse);
  queue.push({ ...job, attempts: 1, createdAt: new Date().toISOString(), lastError: errorMessage });
  await persistQueuedEmails(referenceCode, queue);
}

export async function flushQueuedEmailsForOrder(referenceCode: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { referenceCode }, select: { rawResponse: true } });
  if (!order) return;
  const queue = parseQueuedEmails(order.rawResponse);
  if (queue.length === 0) return;
  const pending: QueuedEmailJob[] = [];
  for (const job of queue) {
    try {
      await dispatchEmailJob(job.type, job.payload);
    } catch (error) {
      pending.push({
        ...job,
        attempts: (job.attempts ?? 0) + 1,
        lastError: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
  await persistQueuedEmails(referenceCode, pending);
}

// ── Core dispatch ──────────────────────────────────────────────────────────────

async function dispatchEmailJob(
  type: QueuedEmailJob["type"],
  payload: QueuedEmailJob["payload"]
): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn("[Email] RESEND_API_KEY no configurada — se omite envío");
    return;
  }
  const resend = getResend()!;

  if (type === "ORDER_CREATED") {
    const order = payload as BaseOrderForEmail;
    const isContraentrega = order.paymentMethod === "CONTRAENTREGA";
    const subject = isContraentrega
      ? `📥 Pedido recibido — Contraentrega #${order.referenceCode.slice(0, 8).toUpperCase()} | A&R`
      : `✅ Pago confirmado — Pedido #${order.referenceCode.slice(0, 8).toUpperCase()} | A&R`;

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: order.customerEmail,
      bcc: internalBcc.length ? internalBcc : undefined,
      replyTo: REPLY_TO || undefined,
      subject,
      html: buildConfirmationEmail(order),
    });
    if (result.error) throw new Error(JSON.stringify(result.error));
    console.log(`📧 [Email] Confirmación enviada a ${order.customerEmail} (id: ${result.data?.id ?? "n/a"})`);
    return;
  }

  // ORDER_STATUS_CHANGED
  const params = payload as StatusChangedPayload;
  const { order, newStatus } = params;
  const statusLabels: Record<string, string> = {
    APPROVED: "Aprobado", SHIPPED: "Enviado", DECLINED: "Rechazado", CANCELLED: "Cancelado",
  };
  const label = statusLabels[newStatus] ?? newStatus;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: order.customerEmail,
    bcc: internalBcc.length ? internalBcc : undefined,
    replyTo: REPLY_TO || undefined,
    subject: `${label} — Pedido #${order.referenceCode.slice(0, 8).toUpperCase()} | A&R`,
    html: buildStatusEmail(params),
  });
  if (result.error) throw new Error(JSON.stringify(result.error));
  console.log(`📧 [Email] Estado (${newStatus}) enviado a ${order.customerEmail}`);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function sendOrderCreatedEmail(order: BaseOrderForEmail): Promise<void> {
  await flushQueuedEmailsForOrder(order.referenceCode);
  try {
    await dispatchEmailJob("ORDER_CREATED", order);
  } catch (error) {
    await enqueueFailedEmail(
      order.referenceCode,
      { id: cryptoRandomId(), type: "ORDER_CREATED", payload: order },
      error instanceof Error ? error.message : "Error desconocido"
    );
    throw error;
  }
}

export async function sendOrderStatusChangedEmail(params: {
  order: BaseOrderForEmail;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}): Promise<void> {
  await flushQueuedEmailsForOrder(params.order.referenceCode);
  try {
    await dispatchEmailJob("ORDER_STATUS_CHANGED", params);
  } catch (error) {
    await enqueueFailedEmail(
      params.order.referenceCode,
      { id: cryptoRandomId(), type: "ORDER_STATUS_CHANGED", payload: params },
      error instanceof Error ? error.message : "Error desconocido"
    );
    throw error;
  }
}


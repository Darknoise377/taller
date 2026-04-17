import nodemailer from "nodemailer";
import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderProductLine = {
  quantity: number;
  product: {
    name: string;
    price: number;
  };
};

type BaseOrderForEmail = {
  referenceCode: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  products: OrderProductLine[];
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
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM;
const internalRecipients = (process.env.EMAIL_INTERNAL_TO ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: Number.isFinite(smtpPort) ? smtpPort : 587,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

function isEmailConfigured(): boolean {
  return Boolean(transporter && smtpFrom);
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 1,
  }).format(amount);
}

function paymentMethodLabel(method: PaymentMethod): string {
  return method === "PAYU" ? "PayU" : "Contraentrega";
}

function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "APPROVED":
      return "Aprobado";
    case "DECLINED":
      return "Rechazado";
    case "PENDING":
      return "Pendiente";
    case "SHIPPED":
      return "Enviado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

function buildOrderLinesHtml(products: OrderProductLine[], currency: string): string {
  return products
    .map(
      (line) =>
        `<tr><td style="padding:8px 0;">${escapeHtml(line.product.name)}</td><td style="padding:8px 0;text-align:center;">${line.quantity}</td><td style="padding:8px 0;text-align:right;">${formatMoney(line.product.price * line.quantity, currency)}</td></tr>`
    )
    .join("");
}

function renderEmailLayout(params: {
  title: string;
  intro: string;
  contentHtml: string;
  footerNote?: string;
}): string {
  const { title, intro, contentHtml, footerNote } = params;
  return `
    <div style="background:#f8fafc;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:18px 24px;background:linear-gradient(90deg,#0A2A66,#2E5FA7);color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.95;">TALLER DE MOTOS A&R</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.2;">${title}</h1>
        </div>
        <div style="padding:22px 24px;">
          <p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#334155;">${intro}</p>
          ${contentHtml}
          <p style="margin:18px 0 0;font-size:12px;color:#64748b;">${footerNote ?? "Este es un mensaje automatico de notificacion de pedidos."}</p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusUpdateMessage(status: OrderStatus): { title: string; detail: string } {
  switch (status) {
    case "APPROVED":
      return {
        title: "Pago confirmado",
        detail: "Tu pago fue aprobado. Iniciaremos preparacion y despacho de tu pedido.",
      };
    case "DECLINED":
      return {
        title: "Pago rechazado",
        detail: "El pago fue rechazado. Puedes intentar nuevamente con otro metodo de pago.",
      };
    case "SHIPPED":
      return {
        title: "Pedido enviado",
        detail: "Tu pedido ya fue despachado. Pronto te compartiremos novedades de entrega.",
      };
    case "CANCELLED":
      return {
        title: "Pedido cancelado",
        detail: "Tu pedido fue cancelado. Si no solicitaste este cambio, contactanos.",
      };
    default:
      return {
        title: "Estado actualizado",
        detail: "Tu pedido tuvo una actualizacion de estado.",
      };
  }
}

function parseQueuedEmails(rawResponse: Prisma.JsonValue | null): QueuedEmailJob[] {
  if (!rawResponse || typeof rawResponse !== "object" || Array.isArray(rawResponse)) return [];
  const rawQueue = (rawResponse as Record<string, unknown>).emailQueue;
  if (!Array.isArray(rawQueue)) return [];

  return rawQueue.filter((item): item is QueuedEmailJob => {
    if (!item || typeof item !== "object") return false;
    const maybe = item as Partial<QueuedEmailJob>;
    return Boolean(maybe.id && maybe.type && maybe.payload && maybe.createdAt);
  });
}

async function persistQueuedEmails(referenceCode: string, queue: QueuedEmailJob[]): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { referenceCode },
    select: { rawResponse: true },
  });

  if (!order) return;

  const baseObject =
    order.rawResponse && typeof order.rawResponse === "object" && !Array.isArray(order.rawResponse)
      ? (order.rawResponse as Record<string, unknown>)
      : {};

  const nextRawResponse = {
    ...baseObject,
    emailQueue: queue,
  } as Prisma.InputJsonValue;

  await prisma.order.update({
    where: { referenceCode },
    data: { rawResponse: nextRawResponse },
  });
}

async function enqueueFailedEmail(referenceCode: string, job: Omit<QueuedEmailJob, "attempts" | "createdAt">, errorMessage: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { referenceCode },
    select: { rawResponse: true },
  });
  if (!order) return;

  const queue = parseQueuedEmails(order.rawResponse);
  queue.push({
    ...job,
    attempts: 1,
    createdAt: new Date().toISOString(),
    lastError: errorMessage,
  });

  await persistQueuedEmails(referenceCode, queue);
}

async function flushQueuedEmailsForOrder(referenceCode: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { referenceCode },
    select: { rawResponse: true },
  });
  if (!order) return;

  const queue = parseQueuedEmails(order.rawResponse);
  if (queue.length === 0) return;

  const pending: QueuedEmailJob[] = [];
  for (const job of queue) {
    try {
      await dispatchEmailJob(job.type, job.payload, false);
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

async function sendWithRetries(mailOptions: Parameters<NonNullable<typeof transporter>["sendMail"]>[0], maxAttempts = 3): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await transporter!.sendMail(mailOptions);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw (lastError instanceof Error ? lastError : new Error("No se pudo enviar email"));
}

export async function sendOrderCreatedEmail(order: BaseOrderForEmail): Promise<void> {
  await flushQueuedEmailsForOrder(order.referenceCode);

  try {
    await dispatchEmailJob("ORDER_CREATED", order, true);
  } catch (error) {
    await enqueueFailedEmail(
      order.referenceCode,
      {
        id: cryptoRandomId(),
        type: "ORDER_CREATED",
        payload: order,
      },
      error instanceof Error ? error.message : "Error desconocido"
    );
    throw error;
  }
}

export async function sendOrderStatusChangedEmail(params: {
  order: BaseOrderForEmail;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}): Promise<void> {
  await flushQueuedEmailsForOrder(params.order.referenceCode);

  try {
    await dispatchEmailJob("ORDER_STATUS_CHANGED", params, true);
  } catch (error) {
    await enqueueFailedEmail(
      params.order.referenceCode,
      {
        id: cryptoRandomId(),
        type: "ORDER_STATUS_CHANGED",
        payload: params,
      },
      error instanceof Error ? error.message : "Error desconocido"
    );
    throw error;
  }
}

async function dispatchEmailJob(
  type: QueuedEmailJob["type"],
  payload: QueuedEmailJob["payload"],
  includeRetries: boolean
): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn("Email no configurado: se omite envio de confirmacion de orden");
    return;
  }

  if (type === "ORDER_CREATED") {
    const order = payload as BaseOrderForEmail;
    const mailOptions = {
      from: smtpFrom,
      to: order.customerEmail,
      bcc: internalRecipients.length > 0 ? internalRecipients : undefined,
      subject: `Confirmacion de pedido #${order.referenceCode}`,
      html: renderEmailLayout({
        title: "Confirmacion de pedido",
        intro: `Hola ${escapeHtml(order.customerName)}, recibimos tu pedido y ya iniciamos el proceso.`,
        contentHtml: `
          <p style="margin:0 0 8px;">Referencia: <strong>#${escapeHtml(order.referenceCode)}</strong></p>
          <p style="margin:0 0 8px;">Metodo de pago: <strong>${paymentMethodLabel(order.paymentMethod)}</strong></p>
          <p style="margin:0 0 14px;">Estado inicial: <strong>${orderStatusLabel(order.status)}</strong></p>
          <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid #e5e7eb;text-align:left;">
                <th style="padding:8px 0;">Producto</th>
                <th style="padding:8px 0;text-align:center;">Cant.</th>
                <th style="padding:8px 0;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${buildOrderLinesHtml(order.products, order.currency)}
            </tbody>
          </table>
          <p style="margin-top:16px;font-size:18px;"><strong>Total: ${formatMoney(order.total, order.currency)}</strong></p>
          <p style="margin-top:8px;color:#475569;">Te notificaremos cualquier cambio en el estado del pago.</p>
        `,
      }),
    };

    if (includeRetries) {
      await sendWithRetries(mailOptions);
    } else {
      await transporter!.sendMail(mailOptions);
    }
    return;
  }

  const { order, previousStatus, newStatus } = payload as StatusChangedPayload;
  const statusMessage = statusUpdateMessage(newStatus);
  const mailOptions = {
    from: smtpFrom,
    to: order.customerEmail,
    bcc: internalRecipients.length > 0 ? internalRecipients : undefined,
    subject: `Actualizacion de pedido #${order.referenceCode}: ${orderStatusLabel(newStatus)}`,
    html: renderEmailLayout({
      title: statusMessage.title,
      intro: `Hola ${escapeHtml(order.customerName)}, hubo una actualizacion en tu pedido.`,
      contentHtml: `
        <p style="margin:0 0 8px;">Pedido: <strong>#${escapeHtml(order.referenceCode)}</strong></p>
        <p style="margin:0 0 8px;">Estado anterior: <strong>${orderStatusLabel(previousStatus)}</strong></p>
        <p style="margin:0 0 8px;">Estado actual: <strong>${orderStatusLabel(newStatus)}</strong></p>
        <p style="margin:0 0 14px;color:#475569;">${statusMessage.detail}</p>
        <p style="margin:0;">Total: <strong>${formatMoney(order.total, order.currency)}</strong></p>
      `,
    }),
  };

  if (includeRetries) {
    await sendWithRetries(mailOptions);
  } else {
    await transporter!.sendMail(mailOptions);
  }
}

function cryptoRandomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

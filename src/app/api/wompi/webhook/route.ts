import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusChangedEmail } from '@/lib/email/orderEmails';
import { isValidWompiWebhookSignature, mapWompiStatusToOrderStatus, type WompiWebhookPayload } from '@/lib/payments/wompi';

const statusPriority: Record<OrderStatus, number> = {
  PENDING: 1,
  APPROVED: 3,
  DECLINED: 2,
  SHIPPED: 4,
  CANCELLED: 4,
};

function shouldUpdateStatus(current: OrderStatus, incoming: OrderStatus): boolean {
  if (current === incoming) return false;
  return statusPriority[incoming] >= statusPriority[current];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WompiWebhookPayload;
    const transaction = body.data?.transaction;
    const referenceCode = transaction?.reference;
    const transactionId = transaction?.id;
    const currency = transaction?.currency;
    const status = transaction?.status;

    if (!referenceCode || !transactionId || !currency) {
      return NextResponse.json({ error: 'Payload inválido de Wompi' }, { status: 400 });
    }

    const wompiEventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (wompiEventsSecret && !isValidWompiWebhookSignature(body, wompiEventsSecret)) {
      return NextResponse.json({ error: 'Firma inválida de Wompi' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { referenceCode },
      select: {
        referenceCode: true,
        customerName: true,
        customerEmail: true,
        total: true,
        currency: true,
        paymentMethod: true,
        status: true,
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
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.currency !== currency) {
      return NextResponse.json({ error: 'Moneda inválida' }, { status: 400 });
    }

    const newStatus = mapWompiStatusToOrderStatus(status);
    const canUpdateStatus = shouldUpdateStatus(order.status, newStatus);

    await prisma.order.update({
      where: { referenceCode },
      data: {
        ...(canUpdateStatus ? { status: newStatus } : {}),
        transactionId,
        paymentNetwork: 'WOMPI',
        rawResponse: body,
      },
    });

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
        console.error('Error enviando email de cambio de estado Wompi:', mailError);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Error en webhook de Wompi:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

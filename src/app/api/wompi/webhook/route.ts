import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusChangedEmail } from '@/lib/email/orderEmails';
import { isValidWompiWebhookSignature, mapWompiStatusToOrderStatus, type WompiWebhookPayload } from '@/lib/payments/wompi';
import { shouldApplyIncomingOrderStatus } from '@/lib/orders/status';

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
    if (!wompiEventsSecret) {
      console.error('WOMPI_EVENTS_SECRET no está configurado');
      return NextResponse.json({ error: 'Configuración incompleta del servidor' }, { status: 500 });
    }

    if (!isValidWompiWebhookSignature(body, wompiEventsSecret)) {
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
        transactionId: true,
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
    const isDuplicateNotification =
      order.transactionId === transactionId &&
      order.status === newStatus;

    if (isDuplicateNotification) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const canUpdateStatus = shouldApplyIncomingOrderStatus(order.status, newStatus);

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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildWompiIntegritySignature } from '@/lib/payments/wompi';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref || ref.length < 10) {
      return NextResponse.json({ error: 'Referencia de orden inválida' }, { status: 400 });
    }

    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    const checkoutBase = process.env.WOMPI_CHECKOUT_URL || 'https://checkout.wompi.co/p/';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

    if (!publicKey || !integritySecret) {
      return NextResponse.json({ error: 'Wompi no está configurado correctamente' }, { status: 500 });
    }

    const order = await prisma.order.findUnique({
      where: { referenceCode: ref },
      select: {
        referenceCode: true,
        total: true,
        currency: true,
        customerEmail: true,
        customerName: true,
        phone: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const amountInCents = Math.round(Number(order.total) * 100);
    const currency = order.currency || 'COP';
    const redirectUrl = new URL('/checkout/response', baseUrl);
    redirectUrl.searchParams.set('referenceCode', order.referenceCode);
    redirectUrl.searchParams.set('provider', 'wompi');

    const integrity = buildWompiIntegritySignature({
      reference: order.referenceCode,
      amountInCents,
      currency,
      integritySecret,
    });

    const checkoutUrl = new URL(checkoutBase);
    checkoutUrl.searchParams.set('public-key', publicKey);
    checkoutUrl.searchParams.set('currency', currency);
    checkoutUrl.searchParams.set('amount-in-cents', String(amountInCents));
    checkoutUrl.searchParams.set('reference', order.referenceCode);
    checkoutUrl.searchParams.set('redirect-url', redirectUrl.toString());
    checkoutUrl.searchParams.set('signature:integrity', integrity);
    checkoutUrl.searchParams.set('customer-data:email', order.customerEmail);
    checkoutUrl.searchParams.set('customer-data:full-name', order.customerName);
    checkoutUrl.searchParams.set('customer-data:phone-number', order.phone || '');

    return NextResponse.redirect(checkoutUrl.toString());
  } catch (error) {
    console.error('❌ Error en redirect a Wompi:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

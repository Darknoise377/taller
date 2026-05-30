import crypto from 'crypto';
import { OrderStatus } from '@prisma/client';

export type WompiWebhookPayload = {
  event?: string;
  timestamp?: number;
  data?: {
    transaction?: {
      id?: string;
      status?: string;
      amount_in_cents?: number;
      reference?: string;
      currency?: string;
      payment_method_type?: string;
    };
  };
  signature?: {
    checksum?: string;
    properties?: string[];
  };
};

export function buildWompiIntegritySignature(input: {
  reference: string;
  amountInCents: number;
  currency: string;
  integritySecret: string;
}): string {
  const data = `${input.reference}${input.amountInCents}${input.currency}${input.integritySecret}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

const DEFAULT_WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';

/** Builds a Wompi checkout URL for an order, or undefined if credentials are missing. */
export function buildWompiCheckoutUrl(order: {
  referenceCode: string;
  total: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  phone: string;
  baseUrl?: string;
}): string | undefined {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!publicKey || !integritySecret) return undefined;

  const baseUrl = order.baseUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const checkoutBase = process.env.WOMPI_CHECKOUT_URL ?? DEFAULT_WOMPI_CHECKOUT_URL;
  const amountInCents = Math.round(Number(order.total) * 100);

  const redirectUrl = new URL('/checkout/response', baseUrl);
  redirectUrl.searchParams.set('referenceCode', order.referenceCode);
  redirectUrl.searchParams.set('provider', 'wompi');

  const integrity = buildWompiIntegritySignature({
    reference: order.referenceCode,
    amountInCents,
    currency: order.currency,
    integritySecret,
  });

  const checkoutUrl = new URL(checkoutBase);
  checkoutUrl.searchParams.set('public-key', publicKey);
  checkoutUrl.searchParams.set('currency', order.currency);
  checkoutUrl.searchParams.set('amount-in-cents', String(amountInCents));
  checkoutUrl.searchParams.set('reference', order.referenceCode);
  checkoutUrl.searchParams.set('redirect-url', redirectUrl.toString());
  checkoutUrl.searchParams.set('signature:integrity', integrity);
  checkoutUrl.searchParams.set('customer-data:email', order.customerEmail);
  checkoutUrl.searchParams.set('customer-data:full-name', order.customerName);
  checkoutUrl.searchParams.set('customer-data:phone-number', order.phone);

  return checkoutUrl.toString();
}

function getValueByPath(source: unknown, path: string): string {
  const resolved = path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);

  if (resolved === null || resolved === undefined) return '';
  return String(resolved);
}

export function isValidWompiWebhookSignature(
  payload: WompiWebhookPayload,
  eventsSecret: string
): boolean {
  const checksum = payload.signature?.checksum;
  const properties = payload.signature?.properties;
  const timestamp = payload.timestamp;

  if (!checksum || !properties?.length || !timestamp) return false;

  const values = properties.map((property) => getValueByPath(payload.data, property)).join('');
  const signed = `${values}${timestamp}${eventsSecret}`;
  const expected = crypto.createHash('sha256').update(signed).digest('hex');

  return checksum.toLowerCase() === expected.toLowerCase();
}

export function mapWompiStatusToOrderStatus(status?: string): OrderStatus {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
      return OrderStatus.APPROVED;
    case 'DECLINED':
    case 'ERROR':
    case 'VOIDED':
      return OrderStatus.DECLINED;
    case 'PENDING':
    default:
      return OrderStatus.PENDING;
  }
}

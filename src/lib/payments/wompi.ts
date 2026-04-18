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

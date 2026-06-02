import { OrderStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { releaseOrderStock } from '@/lib/orders/restoreStock';

const DEFAULT_EXPIRE_HOURS = 48;

export function getPendingWompiExpireHours(): number {
  const raw = process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS;
  const parsed = raw ? Number(raw) : DEFAULT_EXPIRE_HOURS;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_EXPIRE_HOURS;
  }
  return Math.min(parsed, 24 * 14);
}

export type ExpirePendingOrdersResult = {
  scanned: number;
  expired: number;
  referenceCodes: string[];
};

/**
 * Cancels unpaid Wompi orders past TTL and returns their stock.
 * Does not touch APPROVED / SHIPPED / contraentrega.
 */
export async function expireStalePendingWompiOrders(
  now: Date = new Date(),
): Promise<ExpirePendingOrdersResult> {
  const hours = getPendingWompiExpireHours();
  const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const stale = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING,
      paymentMethod: PaymentMethod.WOMPI,
      stockRestoredAt: null,
      createdAt: { lt: cutoff },
    },
    select: { id: true, referenceCode: true },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  const referenceCodes: string[] = [];

  for (const order of stale) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
      await releaseOrderStock(order.id, tx);
    });
    referenceCodes.push(order.referenceCode);
  }

  return {
    scanned: stale.length,
    expired: referenceCodes.length,
    referenceCodes,
  };
}

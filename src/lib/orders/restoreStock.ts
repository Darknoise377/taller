import { OrderStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Statuses that should return reserved inventory to the catalog. */
export const STOCK_RELEASE_STATUSES: OrderStatus[] = [
  OrderStatus.DECLINED,
  OrderStatus.CANCELLED,
];

export function shouldReleaseStockForStatus(status: OrderStatus): boolean {
  return STOCK_RELEASE_STATUSES.includes(status);
}

type Tx = Prisma.TransactionClient;

/**
 * Returns product + combo stock for an order. Idempotent via stockRestoredAt.
 * @returns true if stock was released in this call
 */
export async function releaseOrderStock(
  orderId: number,
  tx?: Tx,
): Promise<boolean> {
  const run = async (client: Tx) => {
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: {
        stockRestoredAt: true,
        products: { select: { productId: true, quantity: true } },
        orderCombos: { select: { comboId: true, quantity: true } },
      },
    });

    if (!order || order.stockRestoredAt) {
      return false;
    }

    for (const line of order.products) {
      await client.product.update({
        where: { id: line.productId },
        data: { stock: { increment: line.quantity } },
      });
    }

    for (const line of order.orderCombos) {
      await client.combo.update({
        where: { id: line.comboId },
        data: {
          stock: { increment: line.quantity },
          soldCount: { decrement: line.quantity },
        },
      });
    }

    await client.order.update({
      where: { id: orderId },
      data: { stockRestoredAt: new Date() },
    });

    return true;
  };

  if (tx) {
    return run(tx);
  }

  return prisma.$transaction(run);
}

/**
 * Updates order status and releases stock when moving to a terminal failure state.
 */
export async function applyOrderStatusWithStockRelease(
  orderId: number,
  newStatus: OrderStatus,
  extraData?: Prisma.OrderUpdateInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus, ...extraData },
    });

    if (shouldReleaseStockForStatus(newStatus)) {
      await releaseOrderStock(orderId, tx);
    }
  });
}

import { OrderStatus } from "@prisma/client";

const allowedStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.APPROVED, OrderStatus.DECLINED, OrderStatus.CANCELLED],
  APPROVED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  DECLINED: [],
  SHIPPED: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  return allowedStatusTransitions[current].includes(next);
}

export function shouldApplyIncomingOrderStatus(current: OrderStatus, incoming: OrderStatus): boolean {
  if (current === incoming) return false;
  return canTransitionOrderStatus(current, incoming);
}

import { OrderStatus, PaymentMethod } from '@/types/order';

export const OrderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  DECLINED: "Rechazado",
  SHIPPED: "Enviado",
  CANCELLED: "Cancelado",
};

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  CONTRAENTREGA: "Contraentrega",
  PAYU: "PayU",
};

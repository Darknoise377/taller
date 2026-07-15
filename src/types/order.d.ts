// src/types/order.d.ts

export type OrderStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'SHIPPED' | 'CANCELLED';
export type PaymentMethod = 'CONTRAENTREGA' | 'PAYU' | 'WOMPI' | 'MERCADO_LIBRE';

export interface OrderCreatePayload {
  total: number;
  shippingCost?: number;
  stockRestoredAt?: string | null;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  address: string;
  city: string;
  department?: string;
  phone: string;
  postalCode?: string;
  cedula?: string;
  products: { productId: string; quantity: number }[];
  combos?: { comboId: string; quantity: number; unitPrice?: number }[];
  sellerId?: string;
  promoCodeApplied?: string;
  status?: OrderStatus;
}

export interface Seller {
  id: string;
  name: string;
  code: string;
}

export interface OrderProduct {
  id: number;
  quantity: number;
  product: {
    id: string;
    price: number;
    name: string;
    imageUrl?: string;
    currency?: 'USD' | 'EUR' | 'COP';
  };
}

export interface Order {
  id: number;
  referenceCode: string;
  total: number;
  shippingCost?: number;
  stockRestoredAt?: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  address: string;
  department?: string;
  city: string;
  postalCode?: string;
  phone: string;
  cedula?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  products: OrderProduct[];
  seller?: Seller | null;
  sellerId?: string | null;
  promoCodeApplied?: string | null;
}

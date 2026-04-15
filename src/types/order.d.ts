// src/types/order.d.ts

// ✅ Enum types alineados con Prisma (en inglés)
export type OrderStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'SHIPPED' | 'CANCELLED';
export type PaymentMethod = 'CONTRAENTREGA' | 'PAYU';

// --- NUEVO TIPO ---
// Payload para CREAR una orden (Lo que envía el frontend)
export interface OrderCreatePayload {
  total: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  address: string;
  city: string;
  department?: string;
  phone: string;
  postalCode?: string;
  cedula?: string;
  products: { productId: number; quantity: number }[];

  // --- Campos Híbridos (Añadidos) ---
  sellerId?: string;
  promoCodeApplied?: string;
  status?: OrderStatus;
}
// --- AÑADE ESTE TIPO ---
// Define cómo se ve un Vendedor cuando se incluye
export interface Seller {
  id: string;
  name: string;
  code: string;
}
// --- FIN DE AÑADIR TIPO ---
// --- FIN NUEVO TIPO ---

// ✅ Producto dentro de la orden (Sin cambios)
export interface OrderProduct {
  id: number;
  quantity: number;
  product: {
    id: number;
    price: number;
    name: string;
    imageUrl?: string;
    // Puedes agregar más campos de Product si los necesitas
  };
}

// ✅ Orden completa (Actualizada con los nuevos campos)
export interface Order {
  id: number;
  referenceCode: string; // importante para PayU y seguimiento
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  address: string;
  department?: string;
  price: number; // Nota: Este campo parece estar de más si ya tienes 'total'
  city: string;
  postalCode?: string;
  phone: string;
  cedula?: string;
  createdAt: string;
  updatedAt: string;
  products: OrderProduct[];
  seller?: Seller | null; // Puede ser null si no hay vendedor asociado
  // --- Campos Híbridos (Añadidos para verlos al leer la orden) ---
  sellerId?: string | null; // Puede ser null en la DB
  promoCodeApplied?: string | null; // Puede ser null en la DB
  
}

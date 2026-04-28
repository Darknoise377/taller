// src/services/orderService.ts

import { Order, OrderStatus, OrderCreatePayload } from '@/types/order'; // 👈 Importamos también OrderCreatePayload

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const orderService = {
  /**
   * Obtiene todas las órdenes
   */
  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_URL}/orders`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener órdenes');
    const json = await res.json();
    // Normalizar respuesta: puede ser un array o un objeto paginado { items }
    return Array.isArray(json) ? (json as Order[]) : (json?.items ?? []) as Order[];
  },

  /**
   * Obtiene una orden por ID
   */
  async getOrder(id: number): Promise<Order> {
    const res = await fetch(`${API_URL}/orders/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Error al obtener la orden con ID ${id}`);
    return (await res.json()) as Order;
  },

  /**
   * Crea una nueva orden
   * 👇 MODIFICADO: Usa OrderCreatePayload y soporta sellerId / promoCodeApplied
   */
  async createOrder(orderData: OrderCreatePayload): Promise<Order> {
    // El payload ya viene casi listo, solo normalizamos los productos
    const payload = {
      ...orderData,
      status: orderData.status ?? 'PENDING', // Valor por defecto
      products: orderData.products.map((p) => ({
        productId: Number(p.productId),
        quantity: p.quantity,
      })),
      // El status se define por defecto en la DB
    };

    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), // 👈 Incluye sellerId y promoCodeApplied si existen
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Error al crear la orden');
    }
    return (await res.json()) as Order;
  },

  /**
   * Actualiza solo el estado de una orden
   */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const res = await fetch(`${API_URL}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Error al actualizar el estado de la orden ${id}`);
    return (await res.json()) as Order;
  },

  /**
   * Actualiza parcialmente una orden
   */
  async updateOrder(
    id: number,
    data: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Order> {
    const payload: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };

    type ProductLike = {
      quantity: number;
      productId?: number;
      product?: { id: number };
    };

    if (data.products) {
      payload.products = (data.products as unknown as ProductLike[]).map((p) => ({
        productId: Number(p.productId ?? p.product?.id),
        quantity: p.quantity,
      }));
    }

    const res = await fetch(`${API_URL}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Error al actualizar la orden ${id}`);
    return (await res.json()) as Order;
  },

  /**
   * Elimina una orden
   */
  async deleteOrder(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Error al eliminar la orden ${id}`);
  },
};

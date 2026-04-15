// src/types/cart.ts

import { Product } from './product';

/**
 * @interface CartItem
 * @description Define la estructura de un ítem dentro del carrito de compras.
 * Incluye la información del producto, la cantidad y las variaciones seleccionadas.
 */
export interface CartItem {
  product: Product;       // Producto completo
  quantity: number;       // Cantidad de este producto en el carrito
  selectedSize?: string;  // Talla seleccionada (opcional)
  selectedColor?: string; // Color seleccionado (opcional)
}

/**
 * @interface CartContextType
 * @description Define la forma del valor que proveerá el CartContext.
 */
export interface CartContextType {
  items: CartItem[];      // Ítems en el carrito
  totalItems: number;     // Total de ítems (suma cantidades)
  cartTotal: number;      // Total monetario
  CartNotification: React.ReactNode;

  // 🛒 Funciones para manipular el carrito
  addToCart: (
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string
  ) => void;

  removeItem: (
    productId: number,       // 🔹 Cambiado a number
    selectedSize?: string,
    selectedColor?: string
  ) => void;

  updateItemQuantity: (
    productId: number,       // 🔹 Cambiado a number
    newQuantity: number,
    selectedSize?: string,
    selectedColor?: string
  ) => void;

  clearCart: () => void;

  // 📦 Control modal
  isCartModalOpen: boolean;
  openCartModal: () => void;
  closeCartModal: () => void;

  // ⏳ Estado de carga
  isCartLoaded: boolean;
}

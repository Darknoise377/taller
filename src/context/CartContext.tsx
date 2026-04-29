"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { Product } from "@/types/product";
import { CartItem, CartContextType } from "@/types/cart";
import { toast } from "sonner";

// ✅ Creamos el contexto del carrito
export const CartContext = createContext<CartContextType | undefined>(undefined);

// ✅ Hook para usar el carrito
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context)
    throw new Error("useCart debe usarse dentro de un CartProvider");
  return context;
};

// Props del proveedor
interface CartProviderProps {
  children: ReactNode;
}

// ✅ URL del API, fallback seguro
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;

  const maybeItem = value as {
    quantity?: unknown;
    product?: { id?: unknown; price?: unknown; name?: unknown };
  };

  return (
    typeof maybeItem.quantity === "number" &&
    maybeItem.quantity > 0 &&
    !!maybeItem.product &&
    typeof maybeItem.product.id === "string" &&
    typeof maybeItem.product.name === "string" &&
    typeof maybeItem.product.price === "number"
  );
}

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isValidCartItem)
    .map((item) => ({
      ...item,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }));
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  /** 🔢 Totales calculados */
  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );

  const cartTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (item.product.price || 0) * (item.quantity || 0),
        0
      ),
    [items]
  );

  /** 📥 Cargar carrito desde backend o localStorage */
  useEffect(() => {
    const fetchCart = async () => {
      if (typeof window === "undefined") return;

      try {
        const stored = localStorage.getItem("cart");
        if (stored) {
          const parsed = sanitizeCartItems(JSON.parse(stored));
          if (parsed.length > 0) {
            setItems(parsed);
            return;
          }
        }
      } catch {
        localStorage.removeItem("cart");
      } finally {
        setIsCartLoaded(true);
      }

      try {
        const res = await fetch(`${API_URL}/cart`, { cache: "no-store" });
        if (!res.ok) throw new Error("Error cargando carrito backend");
        const data = sanitizeCartItems(await res.json());
        setItems(data);
      } catch {
        setItems([]);
      }
    };
    fetchCart();
  }, []);

  /** 💾 Guardar carrito en localStorage y backend */
  useEffect(() => {
    if (!isCartLoaded) return;
    const sanitizedItems = sanitizeCartItems(items);

    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(sanitizedItems));
    }

    fetch(`${API_URL}/cart`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizedItems),
    }).catch((err) => console.error("Error sincronizando carrito:", err));
  }, [items, isCartLoaded]);

  /** 🔔 Mostrar notificación */
  const showNotification = (message: string) => {
    toast.success(message);
  };

  /** 🛒 Funciones de carrito */
  const addToCart = (
    product: Product,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    if (!product || !product.id) return;

    setItems((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === selectedSize &&
          item.selectedColor === selectedColor
      );

      if (index > -1) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          quantity: updated[index].quantity + quantity,
        };
        return updated;
      }

      return [...prev, { product, quantity, selectedSize, selectedColor }];
    });

    showNotification(`${product.name} añadido al carrito`);
  };

  const removeItem = (
    productId: string,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    setItems((prev) =>
      prev.filter(
        (item) =>
          item.product.id !== productId ||
          item.selectedSize !== selectedSize ||
          item.selectedColor !== selectedColor
      )
    );
  };

  const updateItemQuantity = (
    productId: string,
    newQuantity: number,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    setItems((prev) => {
      if (newQuantity <= 0) {
        return prev.filter(
          (item) =>
            item.product.id !== productId ||
            item.selectedSize !== selectedSize ||
            item.selectedColor !== selectedColor
        );
      }

      return prev.map((item) =>
        item.product.id === productId &&
        item.selectedSize === selectedSize &&
        item.selectedColor === selectedColor
          ? { ...item, quantity: Math.max(1, newQuantity) }
          : item
      );
    });
  };

  const clearCart = () => {
    setItems([]);
    setIsCartModalOpen(false);
  };

  /** 📦 Control del modal */
  const openCartModal = () => setIsCartModalOpen(true);
  const closeCartModal = () => setIsCartModalOpen(false);

  /** 🎉 Legacy notification placeholder */
  const CartNotification = null;

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        cartTotal,
        addToCart,
        removeItem,
        updateItemQuantity,
        clearCart,
        isCartModalOpen,
        openCartModal,
        closeCartModal,
        isCartLoaded,
        CartNotification,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

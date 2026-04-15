"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/hooks/useCart";
import { CartItem as ICartItem } from "@/types/cart";
import CartItem from "./CartItem";

import {
  XMarkIcon,
  ShoppingCartIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { isCheckoutPath } from "@/utils/routeUtils";

export default function CartModal() {
  const pathname = usePathname();
  const {
    items,
    totalItems,
    cartTotal,
    clearCart,
    isCartModalOpen,
    closeCartModal,
  } = useCart();

  const modalRef = useRef<HTMLDivElement>(null);

  // Si el usuario entra a checkout y el modal estaba abierto, lo cerramos.
  useEffect(() => {
    if (isCheckoutPath(pathname) && isCartModalOpen) {
      closeCartModal();
      document.body.style.overflow = "unset";
    }
  }, [pathname, isCartModalOpen, closeCartModal]);

  // Manejo de bloqueo de scroll y tecla Escape
  useEffect(() => {
    if (isCartModalOpen) {
      document.body.style.overflow = "hidden";
      // No necesitamos focus en un panel lateral, pero no hace daño
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = "unset";
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCartModal();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isCartModalOpen, closeCartModal]);

  // En checkout ocultamos el modal del carrito por completo
  if (isCheckoutPath(pathname)) return null;

  const overlayActive = isCartModalOpen;

  return (
    <div
      className={
        "fixed inset-0 z-50 flex justify-end bg-black/60 transition-opacity duration-200 " +
        (overlayActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
      }
      onMouseDown={(e) => {
        // Cerrar solo si el click fue en el backdrop
        if (e.target === e.currentTarget) closeCartModal();
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={
          "w-full max-w-md h-full flex flex-col bg-white/80 dark:bg-[#070617]/80 backdrop-blur-xl " +
          "border-l border-slate-200 dark:border-slate-800 shadow-2xl " +
          "transform-gpu transition-transform duration-200 will-change-transform " +
          (overlayActive ? "translate-x-0" : "translate-x-full")
        }
      >
            {/* HEADER */}
            <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                <ShoppingCartIcon className="w-6 h-6 mr-3 text-[#0A2A66]" />
                Tu Carrito ({totalItems})
              </h3>
              <button
                aria-label="Cerrar carrito"
                onClick={closeCartModal}
                className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </header>

            {/* CONTENIDO */}
            <div className="flex-grow overflow-y-auto p-4">
              {items.length === 0 ? (
                // ✨ MEJORA: Estado de carrito vacío rediseñado
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                  <ShoppingCartIcon className="w-24 h-24 mb-4 text-slate-300 dark:text-slate-700" />
                  <h4 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                    Tu carrito está vacío
                  </h4>
                  <p className="mt-2 max-w-xs">
                    Parece que aún no has añadido nada. ¡Explora nuestros productos!
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item: ICartItem) => (
                    <CartItem
                      key={`${item.product.id}-${item.selectedSize || ""}-${item.selectedColor || ""}`}
                      item={item}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* FOOTER */}
            {items.length > 0 && (
              <footer className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-4 bg-white/95 dark:bg-[#070617]/95">
                <div className="flex justify-between items-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <span>Subtotal:</span>
                  <span className="text-[#0A2A66] dark:text-[#2E5FA7]">
                    ${cartTotal.toLocaleString("es-CO")}
                  </span>
                </div>

                <Link href="/checkout" passHref>
                  <button
                    onClick={closeCartModal}
                    // ✨ MEJORA: El botón principal ahora usa tu degradado de marca
                    className="w-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-bold py-3 px-5 rounded-full hover:opacity-90 transition-opacity duration-300 shadow-lg"
                  >
                    Finalizar compra
                  </button>
                </Link>

                <button
                  onClick={clearCart}
                  // ✨ MEJORA: Botón secundario, menos prominente
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 font-medium py-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  Vaciar Carrito
                </button>
              </footer>
            )}
      </div>
    </div>
  );
}

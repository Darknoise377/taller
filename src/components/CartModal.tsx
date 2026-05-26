"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "@/hooks/useCart";
import { CartItem as ICartItem } from "@/types/cart";
import CartItem from "./CartItem";
import ShippingPromo from "./ShippingPromo";
import { GiftIcon, MinusIcon, PlusIcon, TrashIcon as TrashMiniIcon } from "@heroicons/react/24/outline";

import {
  XMarkIcon,
  ShoppingCartIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { isCheckoutPath } from "@/utils/routeUtils";
import { DEFAULT_SHIPPING_CONFIG } from "@/config/shippingRates";
import type { ShippingConfig } from "@/config/shippingRates";

export default function CartModal() {
  const pathname = usePathname();
  const {
    items,
    comboItems,
    totalItems,
    cartTotal,
    comboTotal,
    clearCart,
    isCartModalOpen,
    closeCartModal,
    removeComboFromCart,
    updateComboQuantity,
  } = useCart();

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [shippingConfig, setShippingConfig] = React.useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);

  useEffect(() => {
    fetch('/api/store-settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.shippingRules) setShippingConfig(data.shippingRules as ShippingConfig);
      })
      .catch(() => { /* use default */ });
  }, []);

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
      // Mover foco al botón de cerrar al abrir
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "unset";
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeCartModal(); return; }

      // Focus trap: mantener el foco dentro del panel cuando está abierto
      if (e.key === "Tab" && isCartModalOpen && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isCartModalOpen, closeCartModal]);

  // En checkout ocultamos el modal del carrito por completo
  if (isCheckoutPath(pathname)) return null;

  const overlayActive = isCartModalOpen;
  const grandTotal = cartTotal + comboTotal;
  const FREE_SHIPPING_THRESHOLD = shippingConfig.freeShippingAll ? 0 : shippingConfig.freeShippingThreshold;
  const isFreeShipping = shippingConfig.freeShippingAll || grandTotal >= FREE_SHIPPING_THRESHOLD;
  const missingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - grandTotal);

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
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
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
                ref={closeButtonRef}
                aria-label="Cerrar carrito"
                onClick={closeCartModal}
                className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </header>

            {/* CONTENIDO */}
            <div className="flex-grow overflow-y-auto p-4">
              {items.length === 0 && comboItems.length === 0 ? (
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
                <div className="space-y-4">
                  {/* Regular products */}
                  {items.length > 0 && (
                    <ul className="space-y-4">
                      {items.map((item: ICartItem) => (
                        <CartItem
                          key={`${item.product.id}-${item.selectedSize || ""}-${item.selectedColor || ""}`}
                          item={item}
                        />
                      ))}
                    </ul>
                  )}

                  {/* Combo items */}
                  {comboItems.length > 0 && (
                    <div>
                      {items.length > 0 && <hr className="border-slate-200 dark:border-slate-700 my-2" />}
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Combos</p>
                      <ul className="space-y-3">
                        {comboItems.map((ci) => (
                          <li key={ci.combo.id} className="flex gap-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-800 flex items-center justify-center shrink-0">
                              <GiftIcon className="w-6 h-6 text-purple-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{ci.combo.name}</p>
                              <p className="text-xs text-purple-600 dark:text-purple-400">
                                {ci.combo.surpriseGift ? '🎁 Incluye regalo sorpresa' : ''}
                              </p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                ${(ci.combo.price * ci.quantity).toLocaleString('es-CO')}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button aria-label="Eliminar combo" onClick={() => removeComboFromCart(ci.combo.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <TrashMiniIcon className="w-4 h-4" />
                              </button>
                              <div className="flex items-center gap-1">
                                <button aria-label="Disminuir cantidad" onClick={() => updateComboQuantity(ci.combo.id, ci.quantity - 1)} className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                  <MinusIcon className="w-3 h-3" />
                                </button>
                                <span className="text-sm w-5 text-center">{ci.quantity}</span>
                                <button aria-label="Aumentar cantidad" onClick={() => updateComboQuantity(ci.combo.id, ci.quantity + 1)} className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                  <PlusIcon className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER */}
            {(items.length > 0 || comboItems.length > 0) && (
              <footer className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-4 bg-white/95 dark:bg-[#070617]/95">
                <ShippingPromo
                  subtotal={grandTotal}
                  freeShippingThreshold={FREE_SHIPPING_THRESHOLD}
                  missingForFreeShipping={missingForFreeShipping}
                  isFreeShipping={isFreeShipping}
                />

                <div className="flex justify-between items-center text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <span>Subtotal:</span>
                  <span className="text-[#0A2A66] dark:text-[#2E5FA7]">
                    ${grandTotal.toLocaleString("es-CO")}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-300">
                  <span>Envio estimado:</span>
                  {isFreeShipping ? (
                    <span className="font-semibold text-green-600 dark:text-green-400">GRATIS</span>
                  ) : (
                    <span className="font-medium">Se calcula en checkout</span>
                  )}
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

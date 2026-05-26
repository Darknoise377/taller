"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCartIcon, GiftIcon, FireIcon, CheckIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import type { Combo } from "@/types/combo";
import { useCart } from "@/hooks/useCart";
import CountdownTimer from "./CountdownTimer";
import { BLUR_DATA_URL } from "@/lib/placeholder";

interface ComboCardProps {
  combo: Combo;
  idx?: number;
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default function ComboCard({ combo, idx = 0 }: ComboCardProps) {
  const { addComboToCart, openCartModal } = useCart();
  const [added, setAdded] = useState(false);

  const savings = combo.originalPrice - combo.price;
  const savingsPct = Math.round((savings / combo.originalPrice) * 100);
  const isLowStock = combo.stock > 0 && combo.stock <= 5;
  const isOutOfStock = combo.stock <= 0;
  const isExpiring = !!combo.expiresAt;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock || added) return;
    addComboToCart(combo);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCartModal?.();
    }, 900);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, delay: idx * 0.05, ease: "easeOut" }}
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {combo.badge && (
          <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            <FireIcon className="w-3 h-3" />
            {combo.badge}
          </span>
        )}
        {savingsPct >= 5 && (
          <span className="inline-flex items-center bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            -{savingsPct}% OFF
          </span>
        )}
      </div>

      {/* Image */}
      <Link href={`/combos/${combo.slug}`} className="relative block h-52 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {combo.imageUrl ? (
          <Image
            src={combo.imageUrl}
            alt={combo.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <GiftIcon className="w-16 h-16 text-slate-300 dark:text-slate-600" />
          </div>
        )}
      </Link>

      {/* Countdown */}
      {isExpiring && combo.expiresAt && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-medium">
          <FireIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Oferta termina en:</span>
          <CountdownTimer endTimeIso={combo.expiresAt instanceof Date ? combo.expiresAt.toISOString() : combo.expiresAt} className="font-mono font-bold" />
        </div>
      )}

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Title */}
        <Link href={`/combos/${combo.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">{combo.name}</h3>
        </Link>

        {/* Products included */}
        {combo.items && combo.items.length > 0 && (
          <ul className="flex flex-col gap-1">
            {combo.items.slice(0, 3).map((item) => (
              <li key={item.id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="line-clamp-1">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.product.name}</span>
              </li>
            ))}
            {combo.items.length > 3 && (
              <li className="text-xs text-blue-500 dark:text-blue-400 pl-5">+{combo.items.length - 3} productos más</li>
            )}
          </ul>
        )}

        {/* Surprise gift teaser */}
        {combo.surpriseGift && (
          <div className="flex items-start gap-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800 rounded-xl px-3 py-2">
            <SparklesIcon className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">🎁 Regalo sorpresa incluido</p>
              {combo.surpriseGift.hint && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 italic">{combo.surpriseGift.hint}</p>
              )}
              {combo.surpriseGift.giftValue && (
                <p className="text-xs text-purple-500 dark:text-purple-400">Valor aprox. {formatCOP(combo.surpriseGift.giftValue)}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Pricing */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">{formatCOP(combo.price)}</span>
            {savings > 0 && (
              <span className="text-sm line-through text-slate-400">{formatCOP(combo.originalPrice)}</span>
            )}
          </div>
          {savings > 0 && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Ahorras {formatCOP(savings)}
            </span>
          )}
        </div>

        {/* Stock urgency + social proof */}
        <div className="flex flex-wrap gap-2 text-xs">
          {isLowStock && (
            <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              ¡Solo quedan {combo.stock}!
            </span>
          )}
          {isOutOfStock && (
            <span className="text-slate-400 dark:text-slate-500 font-medium">Agotado</span>
          )}
          {combo.soldCount > 0 && !isOutOfStock && (
            <span className="text-slate-500 dark:text-slate-400">
              🔥 {combo.soldCount} vendidos
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleAdd}
          disabled={isOutOfStock || added}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 w-full
            ${added
              ? "bg-emerald-500 text-white scale-95"
              : isOutOfStock
                ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md hover:shadow-lg"
            }`}
        >
          {added ? (
            <>
              <CheckIcon className="w-4 h-4" />
              ¡Añadido!
            </>
          ) : isOutOfStock ? (
            "Agotado"
          ) : (
            <>
              <ShoppingCartIcon className="w-4 h-4" />
              Añadir combo al carrito
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}

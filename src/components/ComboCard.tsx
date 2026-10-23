"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCartIcon, GiftIcon, FireIcon, CheckIcon, ShareIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { SparklesIcon } from "@heroicons/react/24/solid";
import type { Combo } from "@/types/combo";
import { useCart } from "@/hooks/useCart";
import CountdownTimer from "./CountdownTimer";
import { BLUR_DATA_URL } from "@/lib/placeholder";

interface ComboCardProps {
  combo: Combo;
  idx?: number;
  showDescription?: boolean;
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default function ComboCard({ combo, idx = 0, showDescription = false }: ComboCardProps) {
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
      {/* Share button */}
      <button
        type="button"
        aria-label="Compartir combo"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const url = `${origin}/combos/${combo.slug}`;
          if (typeof navigator !== "undefined" && navigator.share) {
            navigator.share({ title: combo.name, text: `¡Mira este combo especial: ${combo.name}!`, url });
          } else if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(url);
            toast.success("Enlace del combo copiado");
          }
        }}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 shadow border border-slate-200/80 dark:border-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10 text-slate-500 hover:text-slate-800 dark:hover:text-white"
        title="Compartir combo"
      >
        <ShareIcon className="w-4 h-4" />
      </button>

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
          <CountdownTimer endTimeIso={typeof combo.expiresAt === 'string' ? combo.expiresAt : undefined} className="font-mono font-bold" />
        </div>
      )}

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Title */}
        <Link href={`/combos/${combo.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">{combo.name}</h3>
        </Link>

        {/* Description snippet */}
        {showDescription && combo.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed -mt-1">
            {combo.description}
          </p>
        )}

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

        {/* CTAs */}
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleAdd}
            disabled={isOutOfStock || added}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs sm:text-sm font-bold transition-all duration-300
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
                Añadir al carrito
              </>
            )}
          </button>

          {!isOutOfStock && (
            <a
              href={`https://wa.me/573015271104?text=${encodeURIComponent(`¡Hola Motoservicio A&R! 👋 Me interesa comprar el combo ${combo.name} por ${formatCOP(combo.price)} - ` + (typeof window !== "undefined" ? `${window.location.origin}/combos/${combo.slug}` : ""))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-md hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center shrink-0"
              title="Pedir combo por WhatsApp"
              aria-label="Pedir combo por WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

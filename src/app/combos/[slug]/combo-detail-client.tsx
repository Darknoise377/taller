"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingCartIcon,
  CheckIcon,
  ChevronLeftIcon,
  GiftIcon,
  FireIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import type { Combo } from "@/types/combo";
import { useCart } from "@/hooks/useCart";
import CountdownTimer from "@/components/CountdownTimer";
import { BLUR_DATA_URL } from "@/lib/placeholder";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ComboDetailClient({ combo }: { combo: Combo }) {
  const { addComboToCart, openCartModal } = useCart();
  const [added, setAdded] = useState(false);
  const [showCombosPanel, setShowCombosPanel] = useState(false);
  const [relatedCombos, setRelatedCombos] = useState<Combo[]>([]);

  const savings = combo.originalPrice - combo.price;
  const savingsPct = Math.round((savings / combo.originalPrice) * 100);
  const isLowStock = combo.stock > 0 && combo.stock <= 5;
  const isOutOfStock = combo.stock <= 0;

  useEffect(() => {
    let cancelled = false;

    async function loadRelatedCombos() {
      try {
        const res = await fetch("/api/combos?limit=8", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Combo[];
        if (cancelled) return;
        const filtered = data.filter((item) => item.id !== combo.id).slice(0, 4);
        setRelatedCombos(filtered);
      } catch (error) {
        console.error("[ComboDetail] Error loading related combos:", error);
      }
    }

    void loadRelatedCombos();
    return () => {
      cancelled = true;
    };
  }, [combo.id]);

  const relatedCombosLabel = useMemo(() => {
    if (relatedCombos.length === 0) return "Ver combos";
    return `Ver combos (${relatedCombos.length})`;
  }, [relatedCombos.length]);

  const handleAdd = () => {
    if (isOutOfStock || added) return;
    addComboToCart(combo);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCartModal?.();
    }, 900);
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <button
        type="button"
        onClick={() => setShowCombosPanel((prev) => !prev)}
        className="fixed right-4 bottom-24 z-40 md:top-1/2 md:bottom-auto md:-translate-y-1/2 inline-flex items-center gap-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 shadow-2xl hover:scale-[1.02] transition"
      >
        <SparklesIcon className="w-4 h-4" />
        <span className="text-sm font-semibold">{relatedCombosLabel}</span>
      </button>

      <aside
        className={`fixed right-4 z-50 transition-all duration-300 ${
          showCombosPanel
            ? "top-20 opacity-100 pointer-events-auto"
            : "top-24 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-[min(92vw,22rem)] rounded-3xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Combos destacados</p>
            <button
              type="button"
              onClick={() => setShowCombosPanel(false)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Cerrar panel de combos"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {relatedCombos.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Estamos cargando más combos para ti.</p>
          ) : (
            <ul className="space-y-2">
              {relatedCombos.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/combos/${item.slug}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 hover:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                    onClick={() => setShowCombosPanel(false)}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <GiftIcon className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{item.name}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{formatCOP(item.price)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/combos"
            onClick={() => setShowCombosPanel(false)}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Ver catálogo de combos
          </Link>
        </div>
      </aside>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link
          href="/combos"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Volver a combos
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-lg"
        >
          {combo.imageUrl ? (
            <Image
              src={combo.imageUrl}
              alt={combo.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <GiftIcon className="w-24 h-24 text-slate-300 dark:text-slate-600" />
            </div>
          )}
          {/* Savings badge */}
          {savingsPct >= 5 && (
            <div className="absolute top-4 left-4 bg-emerald-500 text-white text-sm font-black px-3 py-1.5 rounded-full shadow">
              -{savingsPct}% OFF
            </div>
          )}
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-5"
        >
          {combo.badge && (
            <span className="inline-flex items-center gap-1 self-start bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full">
              <FireIcon className="w-3.5 h-3.5" />
              {combo.badge}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
            {combo.name}
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
            {combo.description}
          </p>

          {/* Countdown */}
          {combo.expiresAt && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-amber-700 dark:text-amber-300 text-sm font-medium">
              <FireIcon className="w-4 h-4 shrink-0" />
              <span>Oferta termina en:</span>
              <CountdownTimer
                endTimeIso={typeof combo.expiresAt === 'string' ? combo.expiresAt : (combo.expiresAt as unknown as Date)?.toISOString?.() ?? undefined}
                className="font-mono font-bold text-base"
              />
            </div>
          )}

          {/* Products included */}
          {combo.items && combo.items.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide mb-3">
                Incluye ({combo.items.length} {combo.items.length === 1 ? "producto" : "productos"})
              </h2>
              <ul className="flex flex-col gap-2.5">
                {combo.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 relative overflow-hidden shrink-0">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.images?.[0] ?? item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.quantity > 1 ? `${item.quantity}× ` : ""}
                        {item.product.name}
                      </p>
                    </div>
                    <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Surprise gift */}
          {combo.surpriseGift && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-5 flex gap-3">
              <SparklesIcon className="w-6 h-6 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-800 dark:text-purple-200 text-sm">Regalo sorpresa incluido</p>
                {combo.surpriseGift.hint && (
                  <p className="text-sm text-purple-600 dark:text-purple-300 mt-1 italic">
                    Pista: {combo.surpriseGift.hint}
                  </p>
                )}
                {combo.surpriseGift.giftValue && (
                  <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    Valor aproximado: {formatCOP(combo.surpriseGift.giftValue)}
                  </p>
                )}
                <p className="text-xs text-purple-400 dark:text-purple-500 mt-2">
                  El regalo se revela en el correo de confirmación una vez completado tu pedido.
                </p>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {formatCOP(combo.price)}
            </span>
            {savings > 0 && (
              <>
                <span className="text-xl line-through text-slate-400">{formatCOP(combo.originalPrice)}</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  Ahorras {formatCOP(savings)}
                </span>
              </>
            )}
          </div>

          {/* Stock info */}
          <div className="flex flex-wrap gap-3 text-sm">
            {isLowStock && (
              <span className="inline-flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                ¡Solo quedan {combo.stock} disponibles!
              </span>
            )}
            {isOutOfStock && (
              <span className="text-slate-400 dark:text-slate-500 font-medium">Sin stock disponible</span>
            )}
            {combo.soldCount > 0 && !isOutOfStock && (
              <span className="text-slate-500 dark:text-slate-400">🔥 {combo.soldCount} personas ya lo compraron</span>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleAdd}
            disabled={isOutOfStock || added}
            className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold transition-all duration-300
              ${added
                ? "bg-emerald-500 text-white scale-95"
                : isOutOfStock
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-lg hover:shadow-xl"
              }`}
          >
            {added ? (
              <>
                <CheckIcon className="w-5 h-5" />
                ¡Combo añadido al carrito!
              </>
            ) : isOutOfStock ? (
              "Agotado"
            ) : (
              <>
                <ShoppingCartIcon className="w-5 h-5" />
                Añadir combo al carrito
              </>
            )}
          </button>

          {/* Benefits */}
          <ul className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
            {["Envío a todo Colombia", "Pago seguro Wompi", "Garantía incluida", "Soporte post-venta"].map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </main>
  );
}

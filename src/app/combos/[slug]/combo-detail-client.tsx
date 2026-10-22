"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingCartIcon,
  CheckIcon,
  ChevronLeftIcon,
  GiftIcon,
  FireIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import type { Combo } from "@/types/combo";
import { useCart } from "@/hooks/useCart";
import CountdownTimer from "@/components/CountdownTimer";
import { BLUR_DATA_URL } from "@/lib/placeholder";
import { toast } from "sonner";

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

  // Registrar visita a este combo en analytics
  useEffect(() => {
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `/combos/${combo.slug}`, label: combo.name }),
    }).catch(() => {/* ignorar errores de analytics */});
  }, [combo.slug, combo.name]);

  const savings = combo.originalPrice - combo.price;
  const savingsPct = Math.round((savings / combo.originalPrice) * 100);
  const isLowStock = combo.stock > 0 && combo.stock <= 5;
  const isOutOfStock = combo.stock <= 0;

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
          <div className="flex items-center justify-between gap-3">
            {combo.badge ? (
              <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full">
                <FireIcon className="w-3.5 h-3.5" />
                {combo.badge}
              </span>
            ) : <div />}

            <button
              type="button"
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({ title: combo.name, text: `¡Mira este combo especial: ${combo.name}!`, url });
                } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(url);
                  toast.success("Enlace del combo copiado al portapapeles");
                }
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              aria-label="Compartir combo"
              title="Compartir combo"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>

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

          {/* Fila de compartir */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Compartir este combo:</span>

            <button
              type="button"
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({ title: combo.name, text: `¡Mira este combo especial: ${combo.name}!`, url });
                } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(url);
                  toast.success("Enlace copiado al portapapeles");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              aria-label="Compartir enlace"
            >
              <ShareIcon className="w-4 h-4 text-slate-500" />
              <span>Copiar enlace</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Te recomiendo este combo en el Taller de Motos A&R: ${combo.name} - ` + (typeof window !== "undefined" ? window.location.href : ""))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/10 transition-colors shadow-sm"
              aria-label="Compartir por WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>Compartir en WhatsApp</span>
            </a>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

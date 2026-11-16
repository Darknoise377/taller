"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SparklesIcon, TruckIcon, GiftIcon } from "@heroicons/react/24/outline";

type ShippingPromoProps = {
  subtotal: number;
  freeShippingThreshold: number;
  missingForFreeShipping: number;
  isFreeShipping: boolean;
};

export default function ShippingPromo({
  subtotal,
  freeShippingThreshold,
  missingForFreeShipping,
  isFreeShipping,
}: ShippingPromoProps) {
  const progressPercent =
    freeShippingThreshold > 0
      ? Math.min(100, (subtotal / freeShippingThreshold) * 100)
      : 100;

  // Show combo suggestion when the buyer still needs more than 40% of the threshold
  const showComboSuggestion =
    !isFreeShipping &&
    freeShippingThreshold > 0 &&
    missingForFreeShipping > freeShippingThreshold * 0.4;

  return (
    <div className="space-y-3 px-4 py-3.5 bg-gradient-to-r from-amber-50/70 via-stone-50/60 to-emerald-50/50 dark:from-[#092218]/60 dark:to-[#123329]/60 rounded-xl border border-amber-200/60 dark:border-[#e5b842]/20 shadow-sm">
      {!isFreeShipping ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm text-[#0e3d2f] dark:text-[#f3cf65] font-semibold">
            <TruckIcon className="w-4 h-4 shrink-0 text-[#cf9e33]" />
            Faltan ${missingForFreeShipping.toLocaleString("es-CO")} para envío gratis
          </div>
          <div className="relative h-2 bg-stone-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0A2A66] via-[#153B82] to-[#2E5FA7]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          {showComboSuggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between gap-2 pt-1"
            >
              <div className="flex items-center gap-1.5 text-xs text-[#891a2b] dark:text-[#f3cf65]">
                <GiftIcon className="w-4 h-4 shrink-0" />
                <span>¿Sabías que nuestros combos incluyen obsequio?</span>
              </div>
              <Link
                href="/combos"
                className="shrink-0 text-xs font-bold text-[#891a2b] dark:text-[#f3cf65] underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                Ver combos →
              </Link>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300/40 dark:border-emerald-700/40 px-3 py-2 rounded-lg"
        >
          <SparklesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ¡Tienes ENVÍO GRATIS en este pedido!
        </motion.div>
      )}
    </div>
  );
}

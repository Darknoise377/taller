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
    <div className="space-y-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg border border-blue-200 dark:border-slate-700">
      {!isFreeShipping ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 font-semibold">
            <TruckIcon className="w-4 h-4 shrink-0" />
            Faltan ${missingForFreeShipping.toLocaleString("es-CO")} para envio gratis
          </div>
          <div className="relative h-2 bg-white dark:bg-slate-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7]"
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
              <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300">
                <GiftIcon className="w-4 h-4 shrink-0" />
                <span>¿Sabías que nuestros combos incluyen envío gratis?</span>
              </div>
              <Link
                href="/products?category=combos"
                className="shrink-0 text-xs font-bold text-purple-700 dark:text-purple-300 underline underline-offset-2 hover:text-purple-900 dark:hover:text-purple-100 transition-colors"
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
          className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-semibold bg-green-100/50 dark:bg-green-900/20 px-3 py-2 rounded-lg"
        >
          <SparklesIcon className="w-4 h-4" />
          Ya tienes envio GRATIS en este pedido
        </motion.div>
      )}
    </div>
  );
}

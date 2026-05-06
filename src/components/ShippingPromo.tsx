"use client";

import React from "react";
import { motion } from "framer-motion";
import { SparklesIcon, TruckIcon } from "@heroicons/react/24/outline";

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

  return (
    <div className="space-y-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg border border-blue-200 dark:border-slate-700">
      {!isFreeShipping ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 font-semibold">
            <TruckIcon className="w-4 h-4" />
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

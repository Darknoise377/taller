'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ComboCard from '@/components/ComboCard';
import type { Combo } from '@/types/combo';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type CombosClientProps = {
  combos: Combo[];
};

export default function CombosClient({ combos }: CombosClientProps) {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="bg-gradient-to-br from-[#0A2A66] via-[#153B82] to-[#2E5FA7] py-16 px-4 text-white text-center shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(243,207,101,0.15),transparent_50%)] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full mb-4 shadow-sm">
            ✨ Combos y ofertas especiales de temporada
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 leading-tight tracking-tight">
            Combos con regalo sorpresa 🎁
          </h1>
          <p className="text-white/85 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Ahorra más comprando en combo. Cada kit incluye un obsequio especial al completar tu pedido.
          </p>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        {combos.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-xl font-semibold">Próximamente nuevos combos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {combos.map((combo, idx) => (
              <ComboCard key={combo.id} combo={combo} idx={idx} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

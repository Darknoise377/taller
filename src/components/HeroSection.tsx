"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative z-10 flex flex-col items-center justify-center text-center py-32 px-6 overflow-hidden">
      {/* Círculo decorativo */}
      <div className="absolute w-96 h-96 bg-[#0A2A66]/10 rounded-full blur-3xl animate-pulse"></div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-[#0A2A66] dark:text-[#2E5FA7]">
          TALLER DE MOTOS A&amp;R
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-lg md:text-xl mb-8">
          Repuestos, mantenimiento y accesorios.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/products"
            className="bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-all duration-300 shadow-lg"
          >
            Ver repuestos
          </Link>
          <Link
            href="/about"
            className="border border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#2E5FA7] px-8 py-3 rounded-full font-semibold hover:bg-[#0A2A66]/5 dark:hover:bg-[#2E5FA7]/10 transition-all duration-300"
          >
            Conócenos
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

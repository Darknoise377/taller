// src/app/terms/layout.tsx
import type { Metadata } from 'next';
import React from 'react';
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

import { SITE_NAME } from '@/lib/seo/brand';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description:
    `Reglas de uso, compras, pagos, envíos y devoluciones de ${SITE_NAME} en Colombia.`,
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Términos y condiciones | ${SITE_NAME}`,
    url: '/terms',
    type: 'website',
    locale: 'es_CO',
  },
};

/**
 * @function TermsLayout
 * @description Layout específico para la ruta /terms.
 * Envuelve el componente TermsPage y proporciona la metadata.
 */
export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-white dark:bg-[#070617]">
      <header className="relative pt-12 pb-8 px-4 md:px-12 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#0A2A66]/12 via-[#2E5FA7]/10 to-transparent dark:from-[#0A2A66]/24 dark:via-[#2E5FA7]/20 blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto z-10">
          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-6">
            <Link href="/" className="hover:text-[#0A2A66] transition-colors">
              Inicio
            </Link>
            <ChevronRightIcon className="w-4 h-4 mx-1" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Términos
            </span>
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] bg-clip-text text-transparent mb-2">
              Términos y Condiciones
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto md:mx-0">
              Información legal sobre el uso del sitio.
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-12 pb-16">
        {children}
      </main>
    </section>
  );
}
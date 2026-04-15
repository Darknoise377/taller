// src/app/privacy/layout.tsx
import type { Metadata } from 'next';
import React from 'react';
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

// Metadata específica para la página "Política de Privacidad"
export const metadata: Metadata = {
  title: 'Política de Privacidad - TALLER DE MOTOS A&R',
  description:
    'Política de Privacidad de TALLER DE MOTOS A&R: cómo recopilamos, usamos y protegemos tus datos personales al navegar o comprar en Colombia.',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Política de Privacidad - TALLER DE MOTOS A&R',
    description:
      'Cómo recopilamos, usamos y protegemos tus datos al navegar o comprar en TALLER DE MOTOS A&R.',
    url: '/privacy',
    type: 'website',
    locale: 'es_CO',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Política de Privacidad - TALLER DE MOTOS A&R',
    description: 'Información clara sobre tratamiento de datos personales y privacidad en nuestra tienda.',
  },
};

/**
 * @function PrivacyLayout
 * @description Layout específico para la ruta /privacy.
 * Envuelve el componente PrivacyPage y proporciona la metadata.
 */
export default function PrivacyLayout({
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
              Privacidad
            </span>
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] bg-clip-text text-transparent mb-2">
              Política de Privacidad
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto md:mx-0">
              Transparencia sobre el manejo de tu información.
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

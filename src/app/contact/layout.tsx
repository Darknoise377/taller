// src/app/contact/layout.tsx
import type { Metadata } from 'next';
import React from 'react';
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

// Metadata específica para la página "Contacto"
export const metadata: Metadata = {
  title: 'Contacto - TALLER DE MOTOS A&R',
  description:
    'Contacto de TALLER DE MOTOS A&R en Colombia. Soporte para pedidos, repuestos para moto, cambios y atención por canales oficiales.',
  alternates: {
    canonical: '/contact',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Contacto - TALLER DE MOTOS A&R',
    description:
      'Soporte para pedidos, cambios, preguntas de producto y atención general en Colombia por canales oficiales.',
    url: '/contact',
    type: 'website',
    locale: 'es_CO',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contacto - TALLER DE MOTOS A&R',
    description:
      'Habla con nuestro equipo para pedidos, soporte y consultas de repuestos para moto.',
  },
};

/**
 * @function ContactLayout
 * @description Layout específico para la ruta /contact.
 * Envuelve el componente ContactPage y proporciona la metadata.
 */
export default function ContactLayout({
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
              Contacto
            </span>
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] bg-clip-text text-transparent mb-2">
              Contacto
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto md:mx-0">
              Estamos listos para ayudarte con cualquier pregunta.
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

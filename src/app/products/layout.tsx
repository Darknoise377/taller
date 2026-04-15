import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Productos - TALLER DE MOTOS A&R",
  description:
    "Explora repuestos y accesorios para tu moto. Stock visible y compra rápida en TALLER DE MOTOS A&R.",
  alternates: {
    canonical: "/products",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-white dark:bg-[#070617]">
      {/* =========================================
        CABECERA DE PÁGINA
        Define el estilo visual superior de la sección de productos.
        =========================================
      */}
      <header className="relative pt-12 pb-8 px-4 md:px-12 overflow-hidden">
        {/* Fondo decorativo con gradiente y blur */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#0A2A66]/15 via-[#2E5FA7]/10 to-transparent dark:from-[#0A2A66]/25 dark:via-[#2E5FA7]/20 blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto z-10">
          {/* Título principal y descripción de la página */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] bg-clip-text text-transparent mb-2">
              Catálogo de repuestos
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto md:mx-0">
              Encuentra repuestos y accesorios para tu moto con información
              clara, precios visibles y stock actualizado.
            </p>
          </div>
        </div>
      </header>

      {/* =========================================
        CONTENEDOR DE CONTENIDO PRINCIPAL
        Aquí se inyectará el contenido de tu 'page.tsx', 
        que renderiza el componente 'ProductsClient'.
        =========================================
      */}
      <main className="px-4 md:px-12 pb-16">
        {children}
      </main>
    </section>
  );
}

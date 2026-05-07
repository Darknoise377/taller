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
    <section className="bg-white dark:bg-[#070617]">
      {/* Layout limpio para rutas /products/* — el banner se renderiza en la página */}
      <main className="px-4 md:px-12 pb-16">
        {children}
      </main>
    </section>
  );
}

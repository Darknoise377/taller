"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { isCheckoutPath } from "@/utils/routeUtils";

const BRAND_COLORS = ["#0A2A66", "#2E5FA7", "#3b82f6", "#1d4ed8", "#60a5fa", "#2563eb"];

export default function DynamicFooter() {
  const pathname = usePathname();
  const [colorIdx, setColorIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIdx((i) => (i + 1) % BRAND_COLORS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // En checkout y admin no mostramos footer
  if (isCheckoutPath(pathname) || pathname?.startsWith('/admin')) return null;

  return (
    <footer className="bg-gradient-to-t from-[#eaf1fb] via-white to-[#f4f7fb] dark:from-[#07122e] dark:via-[#0a1838] dark:to-[#10234a] text-slate-700 dark:text-gray-300 border-t border-slate-200 dark:border-[#1d3258] relative z-20">
      <div className="max-w-7xl mx-auto px-6 py-12 pb-28">
        {/* Marca y descripción */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <div className="relative h-20 w-48 mb-3">
              <Image
                src="/logo.png"
                alt="Logo Taller de Motos A&R"
                fill
                sizes="192px"
                className="object-contain object-center"
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
              Taller y almacén de repuestos para motos. La Ceja, Antioquia.
            </p>
          </div>

          {/* Navegación */}
          <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-[#0A2A66] transition-colors">
              Inicio
            </Link>
            <Link
              href="/products"
              className="hover:text-[#0A2A66] transition-colors"
            >
              Productos
            </Link>
            <Link
              href="/about"
              className="hover:text-[#0A2A66] transition-colors"
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/contact"
              className="hover:text-[#0A2A66] transition-colors"
            >
              Contacto
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[#0A2A66] transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="/terms"
              className="hover:text-[#0A2A66] transition-colors"
            >
              Términos
            </Link>
          </div>

          {/* Redes sociales */}
          <div className="flex gap-3 justify-center md:justify-end">
            <Link
              href="https://www.facebook.com/AlmacenyTallerAYR/"
              target="_blank"
              aria-label="Facebook"
              className="p-2 rounded-full bg-slate-200 dark:bg-gray-700 hover:bg-[#0A2A66] hover:text-white transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </Link>
            <Link
              href="https://www.instagram.com/motoservicioayr/"
              target="_blank"
              aria-label="Instagram"
              className="p-2 rounded-full bg-slate-200 dark:bg-gray-700 hover:bg-[#2E5FA7] hover:text-white transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </Link>
            <a
              href="https://wa.me/573015271104?text=Hola%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="p-2 rounded-full bg-slate-200 dark:bg-gray-700 hover:bg-[#25D366] hover:text-white transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="border-t border-slate-200 dark:border-gray-700 mt-8 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center mb-4">
            Medios de pago aceptados
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "Wompi", icon: "💳", desc: "Tarjetas · PSE · Nequi" },
              { label: "Contraentrega", icon: "📦", desc: "Pago al recibir" },
              { label: "Transferencia", icon: "🏦", desc: "Bancaria directa" },
              { label: "Efectivo", icon: "💵", desc: "En tienda física" },
            ].map(({ label, icon, desc }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <span className="text-base leading-none">{icon}</span>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-slate-200 dark:border-gray-700 mt-6 pt-6 flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-gray-500 text-center">
          <p>© {new Date().getFullYear()} Almacén y Taller Motoservicio A&amp;R. Todos los derechos reservados.</p>
          <p className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500">Diseño web por</span>
            <span className="brand-text-animate font-black tracking-[0.18em] cursor-default select-none text-[13px]"
              style={{ color: BRAND_COLORS[colorIdx], transition: "color 1.4s ease-in-out" }}>
              FACRISCD
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { isCheckoutPath } from "@/utils/routeUtils";

const BASE_BRAND_COLORS = ["#0A2A66", "#2E5FA7", "#3b82f6", "#1d4ed8", "#60a5fa", "#2563eb"];
const NAVIDAD_BRAND_COLORS = ["#cf9e33", "#1a634b", "#891a2b", "#e5b842", "#2ea879", "#f3cf65"];

export default function DynamicFooter() {
  const pathname = usePathname();
  const [colorIdx, setColorIdx] = useState(0);
  const [isNavidad, setIsNavidad] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ar-season-theme");
      if (stored === "none") {
        setIsNavidad(false);
      } else {
        setIsNavidad(true);
      }
    } catch {
      // ignore
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail && detail.key !== undefined) {
        setIsNavidad(detail.key === "navidad");
      }
    };
    window.addEventListener("ar-season-theme-change", handler);
    return () => window.removeEventListener("ar-season-theme-change", handler);
  }, []);

  const activeColors = isNavidad ? NAVIDAD_BRAND_COLORS : BASE_BRAND_COLORS;

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIdx((i) => (i + 1) % activeColors.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [activeColors.length]);

  // En checkout y admin no mostramos footer
  if (isCheckoutPath(pathname) || pathname?.startsWith("/admin")) return null;

  return (
    <footer
      className={`relative z-20 text-slate-700 dark:text-gray-300 border-t transition-colors duration-300 ${
        isNavidad
          ? "bg-gradient-to-t from-[#f2ece0] via-[#faf7f2] to-[#f7f2e7] dark:from-[#030d0a] dark:via-[#061711] dark:to-[#0a2219] border-[#cf9e33]/30 dark:border-[#e5b842]/20"
          : "bg-gradient-to-t from-[#eaf1fb] via-white to-[#f4f7fb] dark:from-[#07122e] dark:via-[#0a1838] dark:to-[#10234a] border-slate-200 dark:border-[#1d3258]"
      }`}
    >
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
            <p className="text-sm text-slate-600 dark:text-gray-300 mt-2 font-medium">
              {isNavidad ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-amber-500">🎄</span>
                  Edición Especial de Navidad · Motoservicio A&amp;R
                </span>
              ) : (
                "Taller y almacén de repuestos para motos. La Ceja, Antioquia."
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Repuestos garantizados para todas las marcas · Envíos a toda Colombia
            </p>
          </div>

          {/* Navegación */}
          <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm font-medium">
            <Link
              href="/"
              className={isNavidad ? "hover:text-[#cf9e33] dark:hover:text-[#e5b842] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Inicio
            </Link>
            <Link
              href="/products"
              className={isNavidad ? "hover:text-[#cf9e33] dark:hover:text-[#e5b842] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Productos
            </Link>
            <Link
              href="/combos"
              className={isNavidad ? "hover:text-[#cf9e33] dark:hover:text-[#e5b842] transition-colors font-bold text-[#891a2b] dark:text-[#f3cf65]" : "hover:text-[#0A2A66] transition-colors"}
            >
              Combos Navideños
            </Link>
            <Link
              href="/about"
              className={isNavidad ? "hover:text-[#cf9e33] dark:hover:text-[#e5b842] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/contact"
              className={isNavidad ? "hover:text-[#cf9e33] dark:hover:text-[#e5b842] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Contacto
            </Link>
            <Link
              href="/privacy"
              className={isNavidad ? "hover:text-[#cf9e33] dark:hover:text-[#e5b842] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Privacidad
            </Link>
            <Link
              href="/terms"
              className={isNavidad ? "hover:text-[#cf9e33] dark:hover:text-[#e5b842] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
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
              className={`p-2 rounded-full transition-colors ${
                isNavidad
                  ? "bg-stone-200/80 dark:bg-[#0d271f] hover:bg-[#891a2b] hover:text-white"
                  : "bg-slate-200 dark:bg-gray-700 hover:bg-[#0A2A66] hover:text-white"
              }`}
            >
              <Facebook className="w-5 h-5" />
            </Link>
            <Link
              href="https://www.instagram.com/motoservicioayr/"
              target="_blank"
              aria-label="Instagram"
              className={`p-2 rounded-full transition-colors ${
                isNavidad
                  ? "bg-stone-200/80 dark:bg-[#0d271f] hover:bg-[#cf9e33] hover:text-white"
                  : "bg-slate-200 dark:bg-gray-700 hover:bg-[#2E5FA7] hover:text-white"
              }`}
            >
              <Instagram className="w-5 h-5" />
            </Link>
            <a
              href="https://wa.me/573015271104?text=Hola%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20la%20edici%C3%B3n%20navide%C3%B1a"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className={`p-2 rounded-full transition-colors ${
                isNavidad
                  ? "bg-stone-200/80 dark:bg-[#0d271f] hover:bg-[#1a634b] hover:text-white"
                  : "bg-slate-200 dark:bg-gray-700 hover:bg-[#25D366] hover:text-white"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Métodos de pago */}
        <div
          className={`border-t mt-8 pt-6 ${
            isNavidad ? "border-[#cf9e33]/25 dark:border-[#e5b842]/15" : "border-slate-200 dark:border-gray-700"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center mb-4">
            Medios de pago seguros
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${
                  isNavidad
                    ? "bg-white/80 dark:bg-[#092218] border-[#cf9e33]/25 dark:border-[#e5b842]/20 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="text-base leading-none">{icon}</span>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{label}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Línea divisoria */}
        <div
          className={`border-t mt-6 pt-6 flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-gray-400 text-center ${
            isNavidad ? "border-[#cf9e33]/20 dark:border-[#e5b842]/15" : "border-slate-200 dark:border-gray-700"
          }`}
        >
          <p>© {new Date().getFullYear()} Almacén y Taller Motoservicio A&amp;R. Todos los derechos reservados.</p>
          <p className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500">Diseño web por</span>
            <span
              className="brand-text-animate font-black tracking-[0.18em] cursor-default select-none text-[13px]"
              style={{ color: activeColors[colorIdx], transition: "color 1.4s ease-in-out" }}
            >
              FACRISCD
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

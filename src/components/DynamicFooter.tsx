"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { isCheckoutPath } from "@/utils/routeUtils";

export default function DynamicFooter() {
  const pathname = usePathname();
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

  // En checkout y admin no mostramos footer
  if (isCheckoutPath(pathname) || pathname?.startsWith("/admin")) return null;

  return (
    <footer
      className={`relative z-20 text-slate-700 dark:text-gray-300 border-t transition-colors duration-300 ${
        isNavidad
          ? "bg-gradient-to-t from-[#F5F1E8] via-[#FAF7F2] to-[#F5F1E8] dark:from-[#050D20] dark:via-[#07122E] dark:to-[#10243B] border-[#D6B46A]/30 dark:border-[#D6B46A]/20"
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
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D6B46A]/20 text-[#D6B46A] text-xs">✦</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F5F1E8]">Navidad Sobre Ruedas</span>
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <span>Motoservicio A&amp;R</span>
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
              className={isNavidad ? "hover:text-[#D6B46A] dark:hover:text-[#D6B46A] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Inicio
            </Link>
            <Link
              href="/products"
              className={isNavidad ? "hover:text-[#D6B46A] dark:hover:text-[#D6B46A] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Productos
            </Link>
            <Link
              href="/combos"
              className={isNavidad ? "hover:text-[#D6B46A] dark:hover:text-[#D6B46A] transition-colors font-bold text-[#8B1E2F] dark:text-[#D6B46A]" : "hover:text-[#0A2A66] transition-colors"}
            >
              Combos Navideños
            </Link>
            <Link
              href="/about"
              className={isNavidad ? "hover:text-[#D6B46A] dark:hover:text-[#D6B46A] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/contact"
              className={isNavidad ? "hover:text-[#D6B46A] dark:hover:text-[#D6B46A] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Contacto
            </Link>
            <Link
              href="/privacy"
              className={isNavidad ? "hover:text-[#D6B46A] dark:hover:text-[#D6B46A] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
            >
              Privacidad
            </Link>
            <Link
              href="/terms"
              className={isNavidad ? "hover:text-[#D6B46A] dark:hover:text-[#D6B46A] transition-colors" : "hover:text-[#0A2A66] transition-colors"}
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
                  ? "bg-[#07122E]/10 dark:bg-[#10243B] hover:bg-[#8B1E2F] hover:text-white"
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
                  ? "bg-[#07122E]/10 dark:bg-[#10243B] hover:bg-[#D6B46A] hover:text-[#07122E]"
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
                  ? "bg-[#07122E]/10 dark:bg-[#10243B] hover:bg-[#173D32] hover:text-white"
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
            isNavidad ? "border-[#D6B46A]/20 dark:border-[#D6B46A]/15" : "border-slate-200 dark:border-gray-700"
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
                    ? "bg-white/80 dark:bg-[#10243B] border-[#D6B46A]/25 dark:border-[#D6B46A]/20 shadow-sm"
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
            isNavidad ? "border-[#D6B46A]/20 dark:border-[#D6B46A]/15" : "border-slate-200 dark:border-gray-700"
          }`}
        >
          <p>© {new Date().getFullYear()} Almacén y Taller Motoservicio A&amp;R. Todos los derechos reservados.</p>
          <p className="flex items-center gap-2">
            <span className="text-slate-400 dark:text-slate-500">Diseño web por</span>
            <span
              className={`font-black tracking-[0.18em] cursor-default select-none text-[13px] ${
                isNavidad
                  ? "bg-gradient-to-r from-[#D6B46A] via-[#F5F1E8] to-[#D6B46A] bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-[#0A2A66] via-[#2E5FA7] to-[#5B8DD9] dark:from-[#5B8DD9] dark:to-blue-400 bg-clip-text text-transparent"
              }`}
            >
              FACRISCD
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

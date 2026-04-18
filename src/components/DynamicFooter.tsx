"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram } from "lucide-react";
import { isCheckoutPath } from "@/utils/routeUtils";

export default function DynamicFooter() {
  const pathname = usePathname();

  // En checkout no mostramos footer para evitar distracciones
  if (isCheckoutPath(pathname)) return null;

  return (
    <footer className="bg-gradient-to-t from-[#eaf1fb] via-white to-[#f4f7fb] dark:from-[#07122e] dark:via-[#0a1838] dark:to-[#10234a] text-slate-700 dark:text-gray-300 border-t border-slate-200 dark:border-[#1d3258] relative z-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Marca y descripción */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
<div className="relative h-20 w-48 mb-3">
            <Image
                src="/logo.png"
                alt="Logo Taller de Motos A&R"
                fill
                sizes="192px"
                className="object-contain object-left"
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
          <div className="flex gap-4 justify-center md:justify-end">
            <Link
              href="https://www.facebook.com/share/1ADF6KRMDB/?mibextid=wwXIfr"
              target="_blank"
              className="p-2 rounded-full bg-slate-200 dark:bg-gray-700 hover:bg-[#0A2A66] hover:text-white transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </Link>
            <Link
              href="https://www.instagram.com/onelike.tienda"
              target="_blank"
              className="p-2 rounded-full bg-slate-200 dark:bg-gray-700 hover:bg-[#2E5FA7] hover:text-white transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-slate-200 dark:border-gray-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-gray-500">
          <p>© {new Date().getFullYear()} TALLER DE MOTOS A&amp;R. Todos los derechos reservados.</p>
          <p className="mt-2 md:mt-0">
            Diseño web por <span className="text-[#0A2A66] font-semibold">FACRISCD</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

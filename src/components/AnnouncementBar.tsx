"use client";
import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { isCheckoutPath } from "@/utils/routeUtils";

const BASE_MESSAGES = [
  "🚚 Envíos a todo Colombia · Despacho el mismo día hábil",
  "🔒 Pago 100% seguro · Wompi · Transferencia · Contraentrega",
  "⭐ 10+ años de experiencia · Repuestos originales y genéricos",
  "📦 Pedidos antes de las 3:00 PM salen el mismo día",
];

const NAVIDAD_MESSAGES = [
  "🎄 Edición Especial de Navidad · Envíos prioritarios a toda Colombia",
  "🎁 Combos navideños con regalo sorpresa incluido en cada pedido",
  "✨ Stock garantizado y calidad verificada para tu moto esta temporada",
  "🚚 Despachos el mismo día hábil · Compra segura online o contraentrega",
];

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const [isNavidad, setIsNavidad] = useState(true);
  const pathname = usePathname();

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

  const messages = isNavidad ? NAVIDAD_MESSAGES : BASE_MESSAGES;

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 4500);
    return () => clearInterval(id);
  }, [messages.length]);

  if (!visible || isCheckoutPath(pathname) || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div
      className={`relative text-xs font-medium py-2 px-10 text-center select-none z-50 transition-colors duration-300 ${
        isNavidad
          ? "bg-gradient-to-r from-[#420a14] via-[#5c0f1c] to-[#420a14] text-[#fffdf8] border-b border-[#e5b842]/40 shadow-sm"
          : "bg-[#07122E] text-white/85"
      }`}
    >
      <span
        className={`transition-opacity duration-300 inline-flex items-center gap-2 ${fade ? "opacity-100" : "opacity-0"}`}
      >
        {messages[current % messages.length]}
      </span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full"
        aria-label="Cerrar anuncio"
      >
        <XMarkIcon className="w-4 h-4 text-white/90" />
      </button>
    </div>
  );
}

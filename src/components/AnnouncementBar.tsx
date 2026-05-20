"use client";
import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { isCheckoutPath } from "@/utils/routeUtils";

const MESSAGES = [
  "🚚 Envíos a todo Colombia · Despacho el mismo día hábil",
  "🔒 Pago 100% seguro · Wompi · Transferencia · Contraentrega",
  "⭐ 10+ años de experiencia · Repuestos originales y genéricos",
  "📦 Pedidos antes de las 3:00 PM salen el mismo día",
];

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % MESSAGES.length);
        setFade(true);
      }, 300);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  if (!visible || isCheckoutPath(pathname) || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="relative bg-[#07122E] text-white/85 text-xs font-medium py-2 px-10 text-center select-none z-50">
      <span
        className={`transition-opacity duration-300 inline-block ${fade ? "opacity-100" : "opacity-0"}`}
      >
        {MESSAGES[current]}
      </span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity p-1 rounded"
        aria-label="Cerrar anuncio"
      >
        <XMarkIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

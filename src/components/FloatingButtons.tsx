"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { isCheckoutPath } from "@/utils/routeUtils";
import { AnimatePresence, motion } from "framer-motion";

const WHATSAPP_NUMBER = "573015271104";
const WHATSAPP_MESSAGE = "Hola, estoy interesado en los repuestos de Motoservicio A&R";

const WHATSAPP_AI_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_AI_NUMBER ?? "573203267829";
const WHATSAPP_AI_MESSAGE = "Hola, necesito ayuda para encontrar un repuesto";

function WaIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="white" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function BotIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M9 11V7a3 3 0 0 1 6 0v4" />
      <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
      <path d="M12 2v3" strokeLinecap="round" />
    </svg>
  );
}

export default function FloatingButtons() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (isCheckoutPath(pathname) || pathname?.startsWith("/admin")) return null;

  const isProductDetail = !!pathname?.match(/^\/products\/[^/]+$/);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const whatsappAIUrl = `https://wa.me/${WHATSAPP_AI_NUMBER}?text=${encodeURIComponent(WHATSAPP_AI_MESSAGE)}`;

  return (
    <div
      className={`fixed ${
        isProductDetail ? "bottom-[calc(8.5rem+env(safe-area-inset-bottom))]" : "bottom-20"
      } md:bottom-6 right-4 z-40 flex flex-col items-end gap-3`}
    >
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Volver arriba"
        className={`w-11 h-11 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 ${
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ChevronUpIcon className="w-5 h-5" />
      </button>

      {/* WhatsApp contact group */}
      <div ref={menuRef} className="relative flex flex-col items-end">

        {/* Expanded options panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className="absolute bottom-[4.5rem] right-0 w-[260px] sm:w-[280px]"
            >
              {/* Card */}
              <div className="bg-white dark:bg-[#0f1729] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
                {/* Card header */}
                <div className="bg-[#25D366] px-4 py-3 flex items-center gap-2.5">
                  <WaIcon className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">Motoservicio A&amp;R</p>
                    <p className="text-green-100 text-[11px] leading-tight">¿En qué te podemos ayudar?</p>
                  </div>
                </div>

                {/* Options */}
                <div className="p-2 flex flex-col gap-1.5">
                  {/* Criss – AI assistant */}
                  <a
                    href={whatsappAIUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                      <BotIcon className="w-5 h-5 text-white" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        Criss
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                        Asistente virtual IA
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>

                  <div className="mx-3 h-px bg-slate-100 dark:bg-slate-700/60" />

                  {/* Direct line */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                  >
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-green-500/20 group-hover:scale-105 transition-transform">
                      <WaIcon className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        Línea directa
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                        Atención humana
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Pointer arrow */}
              <div className="absolute -bottom-2 right-5 w-4 h-4 bg-white dark:bg-[#0f1729] rotate-45 shadow-md ring-1 ring-black/5 dark:ring-white/5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main trigger button */}
        <motion.button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Abrir opciones de WhatsApp"
          aria-expanded={menuOpen}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors duration-300 ${
            menuOpen
              ? "bg-slate-700 shadow-slate-700/40"
              : "bg-[#25D366] shadow-[#25D366]/40 hover:shadow-[#25D366]/60"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {menuOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -60, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 60, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                <XMarkIcon className="w-7 h-7 text-white" />
              </motion.span>
            ) : (
              <motion.span
                key="wa"
                initial={{ rotate: 60, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -60, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                <WaIcon className="w-7 h-7" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}

const WHATSAPP_AI_MESSAGE = "Hola, necesito ayuda para encontrar un repuesto";

export default function FloatingButtons() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showWaTooltip, setShowWaTooltip] = useState(false);
  const tooltipShownRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Show WhatsApp tooltip after 5s (once per session)
  useEffect(() => {
    if (tooltipShownRef.current) return;
    const t = setTimeout(() => {
      setShowWaTooltip(true);
      tooltipShownRef.current = true;
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Ocultar en checkout y admin
  if (isCheckoutPath(pathname) || pathname?.startsWith('/admin')) return null;

  const isProductDetail = !!pathname?.match(/^\/products\/[^/]+$/);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const whatsappAIUrl = `https://wa.me/${WHATSAPP_AI_NUMBER}?text=${encodeURIComponent(WHATSAPP_AI_MESSAGE)}`;

  return (
    <div className={`fixed ${isProductDetail ? 'bottom-[calc(8.5rem+env(safe-area-inset-bottom))]' : 'bottom-20'} md:bottom-6 right-4 z-40 flex flex-col items-center gap-3`}>
      {/* Back to top */}
      <button
        onClick={scrollToTop}
        aria-label="Volver arriba"
        className={`w-11 h-11 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 ${
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ChevronUpIcon className="w-5 h-5" />
      </button>

      {/* WhatsApp AI assistant */}
      <div className="relative group/ai">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2.5 pointer-events-none opacity-0 group-hover/ai:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
            Asistente IA por WhatsApp
          </div>
        </div>
        <a
          href={whatsappAIUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Asistente IA por WhatsApp"
          className="w-12 h-12 rounded-full bg-[#1a56db] shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 group relative"
        >
          {/* Bot icon */}
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M9 11V7a3 3 0 0 1 6 0v4" />
            <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
            <path d="M12 2v3" strokeLinecap="round" />
          </svg>
          {/* Small WhatsApp badge */}
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center shadow">
            <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </span>
        </a>
      </div>

      {/* WhatsApp */}
      <div className="relative flex flex-col items-end gap-2">
        {/* Tooltip bubble */}
        {showWaTooltip && (
          <div className="absolute bottom-full right-0 mb-2.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-xl animate-[fadeIn_0.3s_ease]">
            <button
              type="button"
              onClick={() => setShowWaTooltip(false)}
              aria-label="Cerrar"
              className="absolute top-2 right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base leading-none transition-colors"
            >
              ×
            </button>
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm pr-4">¿Necesitas ayuda?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              Escríbenos por WhatsApp y te atendemos al instante.
            </p>
          </div>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          onClick={() => setShowWaTooltip(false)}
          className="w-14 h-14 rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/30 flex items-center justify-center hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40 transition-all duration-300 group"
        >
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className="w-7 h-7 group-hover:scale-105 transition-transform"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
      </div>
    </div>
  );
}

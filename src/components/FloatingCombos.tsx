"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import ComboCard from "@/components/ComboCard";
import type { Combo } from "@/types/combo";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  XMarkIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import { isCheckoutPath } from "@/utils/routeUtils";
import { useCart } from "@/context/CartContext";

type ComboFilter = "most_sold" | "max_savings" | "low_stock" | "featured";

interface FloatingCombosProps {
  excludeProductId?: string | null;
  initialFilter?: ComboFilter;
  limit?: number;
}

const FILTER_OPTIONS: { id: ComboFilter; label: string }[] = [
  { id: "most_sold", label: "Más vendidos" },
  { id: "max_savings", label: "Mayor ahorro" },
  { id: "low_stock", label: "Últimas unidades" },
  { id: "featured", label: "Destacados" },
];

export default function FloatingCombos({
  excludeProductId,
  initialFilter = "most_sold",
  limit = 12,
}: FloatingCombosProps) {
  const pathname = usePathname();
  const { isCartModalOpen } = useCart();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
    const [waMenuOpen, setWaMenuOpen] = useState(false);
    const [aiChatOpen, setAiChatOpen] = useState(false);
    const [combos, setCombos] = useState<Combo[]>([]);
  const [filter, setFilter] = useState<ComboFilter>(initialFilter);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
      const handler = (e: Event) => setWaMenuOpen((e as CustomEvent<{ open: boolean }>).detail.open);
      const aiHandler = (e: Event) => setAiChatOpen((e as CustomEvent<{ open: boolean }>).detail.open);
    
      window.addEventListener('wa-menu-change', handler);
      window.addEventListener('ai-chat-change', aiHandler);
      return () => {
        window.removeEventListener('wa-menu-change', handler);
        window.removeEventListener('ai-chat-change', aiHandler);
      };
    }, []);

    // Efecto adicional para intentar auto-detectar librerías de chat de IA comunes si no usan el evento
    useEffect(() => {
      // Observador para chats que inyectan iframes o divs globales (ej: Intercom, Zendesk, o tu IA)
      const checkChatOpened = () => {
        const chatElements = document.querySelectorAll('[id*="chat"], [class*="chat-window"], [class*="ai-assistant"], iframe[title*="chat"]');
        let isChatVisible = false;
      
        chatElements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            // Solo consideramos ventanas abiertas, no el botoncito cerrado
            if (el.clientHeight > 150 || el.clientWidth > 150) {
               isChatVisible = true;
            }
          }
        });
      
        if (isChatVisible !== aiChatOpen) {
          setAiChatOpen(isChatVisible);
        }
      };

      const observer = new MutationObserver(() => checkChatOpened());
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    
      return () => observer.disconnect();
    }, [aiChatOpen]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/combos?limit=${limit}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Combo[];
        if (cancelled) return;
        const filtered = data.filter((c) => {
          if (!excludeProductId) return true;
          return !c.items.some(
            (it) =>
              String(it.productId) === String(excludeProductId) ||
              it.product?.id === excludeProductId,
          );
        });
        setCombos(filtered);
      } catch (err) {
        console.error("[FloatingCombos] error loading combos", err);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [excludeProductId, limit]);

  const sorted = useMemo(() => {
    const copy = [...combos];
    switch (filter) {
      case "most_sold":
        return copy.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
      case "max_savings":
        return copy.sort(
          (a, b) => b.originalPrice - b.price - (a.originalPrice - a.price),
        );
      case "low_stock":
        return copy.sort((a, b) => (a.stock ?? 9999) - (b.stock ?? 9999));
      case "featured":
        return copy.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
      default:
        return copy;
    }
  }, [combos, filter]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const scrollBy = (dir: -1 | 1) => {
    const s = scrollerRef.current;
    if (!s) return;
    s.scrollBy({ left: dir * s.clientWidth * 0.85, behavior: "smooth" });
  };

  if (isCheckoutPath(pathname) || pathname?.startsWith("/admin")) return null;

  const isProductDetail = !!pathname?.match(/^\/products\/[^/]+$/);
    // Mobile: FloatingButtons (WA) sits at bottom-20 (5rem) on normal pages, its 56px button top = ~8.5rem.
  // On product detail it sits at 8.5rem, top = ~12rem. Add 0.75rem gap above each.
  const fabBottom = isProductDetail
    ? "bottom-[calc(12.75rem+env(safe-area-inset-bottom))] md:bottom-24"
    : "bottom-[calc(9.25rem+env(safe-area-inset-bottom))] md:bottom-24";

  const sheet = (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar combos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[2px]"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="floating-combos-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[81] flex max-h-[min(92dvh,820px)] flex-col rounded-t-[1.75rem] border border-slate-200/80 bg-white shadow-[0_-24px_80px_rgba(10,42,102,0.22)] dark:border-slate-700 dark:bg-[#0c1222] md:inset-x-auto md:bottom-6 md:right-4 md:left-auto md:w-[min(100vw-2rem,28rem)] md:max-h-[min(85dvh,720px)] md:rounded-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 md:hidden" />

            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-800 sm:px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] text-white shadow-md">
                    <GiftIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2
                      id="floating-combos-title"
                      className="text-base font-extrabold text-slate-900 dark:text-white"
                    >
                      Combos con ahorro
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {combos.length > 0
                        ? `${combos.length} paquetes disponibles`
                        : "Cargando ofertas…"}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar panel"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="shrink-0 overflow-x-auto px-4 py-3 no-scrollbar sm:px-5">
              <div className="flex w-max gap-2">
                {FILTER_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.id}
                    active={filter === opt.id}
                    onClick={() => setFilter(opt.id)}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden px-1 sm:px-2">
              {sorted.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
                  <SparklesIcon className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">No hay combos para mostrar ahora.</p>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => scrollBy(-1)}
                    aria-label="Combo anterior"
                    className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 sm:flex"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <div
                    ref={scrollerRef}
                    className="flex h-full gap-3 overflow-x-auto overflow-y-hidden px-3 py-2 snap-x snap-mandatory no-scrollbar"
                  >
                    {sorted.map((c, i) => (
                      <div
                        key={c.id}
                        className="w-[min(88vw,17.5rem)] shrink-0 snap-center sm:w-[16.5rem]"
                      >
                        <ComboCard combo={c} idx={i} />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollBy(1)}
                    aria-label="Siguiente combo"
                    className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 sm:flex"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
              <Link
                href="/combos"
                onClick={close}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A2A66] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#081F4D]"
              >
                Ver catálogo completo de combos
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        whileTap={{ scale: 0.96 }}
        className={`fixed right-4 z-[75] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] px-4 py-2.5 text-white shadow-[0_8px_32px_rgba(10,42,102,0.45)] ring-2 ring-white/20 transition hover:shadow-[0_12px_40px_rgba(10,42,102,0.55)] ${fabBottom} ${open || isCartModalOpen || waMenuOpen || aiChatOpen ? "pointer-events-none opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
              >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <SparklesIcon className="h-5 w-5" />
          {combos.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#0A2A66]">
              {Math.min(combos.length, 9)}
              {combos.length > 9 ? "+" : ""}
            </span>
          )}
        </span>
        <span className="text-sm font-bold">Combos</span>
      </motion.button>

      {mounted && createPortal(sheet, document.body)}
    </>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[#0A2A66] text-white shadow-md"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

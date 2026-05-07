"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type StubProduct = { id?: string; name: string; image?: string; images?: string[] };

interface Props {
  products?: StubProduct[];
  maxItems?: number;
}

const NAMES = [
  "Juan",
  "María",
  "Carlos",
  "Ana",
  "Luis",
  "Sofía",
  "Andrés",
  "Laura",
  "Diego",
  "Camila",
  "Pedro",
  "Valentina",
  "Felipe",
  "Paola",
];

function random<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function timeAgoText(mins: number) {
  if (mins <= 1) return "hace 1 min";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs} h`;
}

export default function RecentPurchases({ products = [], maxItems = 4 }: Props) {
  const [items, setItems] = useState<{
    id: string;
    name: string;
    product: string;
    image?: string;
    minutes: number;
  }[]>([]);

  useEffect(() => {
    const seed = products.length
      ? products.slice(0, Math.min(3, products.length)).map((p, i) => ({
          id: `seed-${i}`,
          name: random(NAMES),
          product: p.name,
          image: (p.images && p.images[0]) ?? p.image ?? "/placeholder.png",
          minutes: Math.floor(Math.random() * 30) + 1,
        }))
      : Array.from({ length: 3 }).map((_, i) => ({
          id: `seed-${i}`,
          name: random(NAMES),
          product: `Repuesto ${i + 1}`,
          image: "/placeholder.png",
          minutes: Math.floor(Math.random() * 30) + 1,
        }));

    setItems(seed);

    const iv = setInterval(() => {
      const prod = products.length
        ? products[Math.floor(Math.random() * products.length)]
        : { id: "p1", name: "Repuesto random", image: "/placeholder.png" };
      const next = {
        id: `ev-${Date.now()}`,
        name: random(NAMES),
        product: prod.name || "Producto",
        image: (prod as any).images?.[0] ?? (prod as any).image ?? "/placeholder.png",
        minutes: 0,
      };
      setItems((prev) => {
        const updated = [next, ...prev].slice(0, maxItems);
        return updated.map((it, idx) => ({ ...it, minutes: it.minutes + (idx === 0 ? 0 : 1) }));
      });
    }, 10000 + Math.floor(Math.random() * 8000));

    return () => clearInterval(iv);
  }, [products, maxItems]);

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl p-3 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Compras en tiempo real</h4>
        <span className="text-xs text-slate-500">En línea</span>
      </div>
      <ul className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3"
            >
              <div className="relative w-9 h-9 rounded-md overflow-hidden border border-slate-200 dark:border-slate-800">
                <Image src={it.image || "/placeholder.png"} alt={it.product} fill className="object-cover" sizes="36px" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold leading-tight">
                  {it.name} compró <span className="text-[#0A2A66]">{it.product}</span>
                </div>
                <div className="text-xs text-slate-500">{timeAgoText(it.minutes)}</div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

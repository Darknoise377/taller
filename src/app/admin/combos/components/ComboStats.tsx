// src/app/admin/combos/components/ComboStats.tsx
'use client';

import React from 'react';
import {
  Package,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { AdminCombo, FilterStatus } from '../types';

interface ComboStatsProps {
  combos: AdminCombo[];
  currentStatus: FilterStatus;
  onSelectStatus: (status: FilterStatus) => void;
}

export default function ComboStats({
  combos,
  currentStatus,
  onSelectStatus,
}: ComboStatsProps) {
  // Calculations
  const totalCombos = combos.length;
  const activeCombos = combos.filter((c) => c.isActive && !c.isExpired).length;
  const featuredCombos = combos.filter((c) => c.isFeatured).length;
  const totalOrders = combos.reduce((acc, c) => acc + (c._count?.orderCombos ?? c.soldCount ?? 0), 0);
  const lowStockCombos = combos.filter((c) => c.stock <= 3).length;

  const avgDiscount = totalCombos > 0
    ? Math.round(
        combos.reduce((acc, c) => acc + (c.savingsPercent || (c.originalPrice > 0 ? Math.round(((c.originalPrice - c.price) / c.originalPrice) * 100) : 0)), 0) /
          totalCombos
      )
    : 0;

  const cards = [
    {
      id: 'all' as FilterStatus,
      label: 'Total Combos',
      value: totalCombos,
      sublabel: `${activeCombos} publicados`,
      icon: Package,
      gradient: 'from-blue-500/20 to-sky-500/10',
      border: 'border-blue-500/30',
      iconColor: 'text-sky-400',
      accentColor: 'text-sky-300',
    },
    {
      id: 'active' as FilterStatus,
      label: 'Activos en Tienda',
      value: activeCombos,
      sublabel: 'Visibles para compra',
      icon: CheckCircle2,
      gradient: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      accentColor: 'text-emerald-300',
    },
    {
      id: 'featured' as FilterStatus,
      label: 'Destacados en Home',
      value: featuredCombos,
      sublabel: 'Vitrina principal',
      icon: Sparkles,
      gradient: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      accentColor: 'text-amber-300',
    },
    {
      id: 'all' as FilterStatus,
      label: 'Ventas de Combos',
      value: totalOrders,
      sublabel: 'Órdenes procesadas',
      icon: ShoppingBag,
      gradient: 'from-purple-500/20 to-indigo-500/10',
      border: 'border-purple-500/30',
      iconColor: 'text-purple-400',
      accentColor: 'text-purple-300',
      clickable: false,
    },
    {
      id: 'all' as FilterStatus,
      label: 'Ahorro Promedio',
      value: `${avgDiscount}%`,
      sublabel: 'Descuento al cliente',
      icon: TrendingUp,
      gradient: 'from-cyan-500/20 to-blue-500/10',
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400',
      accentColor: 'text-cyan-300',
      clickable: false,
    },
    {
      id: 'low_stock' as FilterStatus,
      label: 'Stock Crítico',
      value: lowStockCombos,
      sublabel: lowStockCombos === 0 ? 'Stock saludable' : 'Requiere atención',
      icon: AlertTriangle,
      gradient: lowStockCombos > 0 ? 'from-rose-500/20 to-red-500/10' : 'from-slate-800 to-slate-900',
      border: lowStockCombos > 0 ? 'border-rose-500/40' : 'border-slate-800',
      iconColor: lowStockCombos > 0 ? 'text-rose-400' : 'text-slate-400',
      accentColor: lowStockCombos > 0 ? 'text-rose-300' : 'text-slate-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isSelected = card.clickable !== false && currentStatus === card.id;

        return (
          <div
            key={idx}
            onClick={() => {
              if (card.clickable !== false) {
                onSelectStatus(card.id);
              }
            }}
            className={`relative group flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 backdrop-blur-sm border transition-all ${
              card.border
            } ${
              card.clickable !== false ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : ''
            } ${
              isSelected ? 'ring-2 ring-sky-400 shadow-sky-500/20 shadow-md' : 'shadow-sm'
            }`}
          >
            {/* Background gradient hint */}
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`}
            />

            <div className="relative z-10 flex items-start justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg bg-slate-800/80 ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="relative z-10 mt-2 sm:mt-3">
              <div className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {card.value}
              </div>
              <p className={`text-[11px] mt-0.5 font-medium truncate ${card.accentColor}`}>
                {card.sublabel}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

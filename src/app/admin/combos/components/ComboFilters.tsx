// src/app/admin/combos/components/ComboFilters.tsx
'use client';

import React from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Gift,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { AdminCombo, FilterStatus, SortOption } from '../types';

interface ComboFiltersProps {
  combos: AdminCombo[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  status: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onReset: () => void;
}

export default function ComboFilters({
  combos,
  searchTerm,
  onSearchChange,
  status,
  onStatusChange,
  sortOption,
  onSortChange,
  onReset,
}: ComboFiltersProps) {
  // Counts
  const counts = {
    all: combos.length,
    active: combos.filter((c) => c.isActive && !c.isExpired).length,
    featured: combos.filter((c) => c.isFeatured).length,
    gift: combos.filter((c) => !!c.surpriseGift).length,
    inactive: combos.filter((c) => !c.isActive).length,
    low_stock: combos.filter((c) => c.stock <= 3).length,
    expired: combos.filter((c) => !!c.isExpired).length,
  };

  const tabs = [
    { id: 'all' as FilterStatus, label: 'Todos', count: counts.all, icon: SlidersHorizontal },
    { id: 'active' as FilterStatus, label: 'Activos', count: counts.active, icon: CheckCircle },
    { id: 'featured' as FilterStatus, label: 'Destacados', count: counts.featured, icon: Sparkles },
    { id: 'gift' as FilterStatus, label: 'Con Regalo', count: counts.gift, icon: Gift },
    { id: 'inactive' as FilterStatus, label: 'Inactivos', count: counts.inactive, icon: AlertCircle },
    { id: 'low_stock' as FilterStatus, label: 'Bajo Stock', count: counts.low_stock, icon: AlertCircle },
    { id: 'expired' as FilterStatus, label: 'Expirados', count: counts.expired, icon: Clock },
  ];

  const hasActiveFilters = searchTerm.trim().length > 0 || status !== 'all' || sortOption !== 'recent';

  return (
    <div className="flex flex-col gap-3.5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
      {/* Top Row: Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, slug, badge o producto..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Select & Reset */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="pl-8 pr-8 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer"
            >
              <option value="recent">Más Recientes</option>
              <option value="sales">Más Vendidos / Pedidos</option>
              <option value="discount">Mayor % de Ahorro</option>
              <option value="stock_asc">Menor Stock (Urgencia)</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="px-2.5 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const isSelected = status === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold shadow-md shadow-sky-600/20'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 opacity-80" />
              <span>{tab.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

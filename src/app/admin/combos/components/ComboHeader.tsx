// src/app/admin/combos/components/ComboHeader.tsx
'use client';

import React from 'react';
import {
  Gift,
  Plus,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import { ViewMode } from '../types';

interface ComboHeaderProps {
  totalCombos: number;
  activeCombos: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenCreate: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function ComboHeader({
  totalCombos,
  activeCombos,
  viewMode,
  onViewModeChange,
  onOpenCreate,
  onRefresh,
  isRefreshing,
}: ComboHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800">
      {/* Title & Badge */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/20">
            <div className="w-full h-full rounded-[10px] bg-[#071838] flex items-center justify-center">
              <Gift className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Gestión de Combos & Kits
          </h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-sky-500/10 to-blue-500/20 text-sky-300 border border-sky-400/30">
            <Sparkles className="w-3 h-3 text-sky-400" />
            PRO PLUS
          </span>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">
          Diseña kits de alta conversión, calcula descuentos automáticos, programa ofertas temporales y añade regalos sorpresa para maximizar el ticket promedio.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
        {/* View Toggle */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista en Cuadrícula"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tarjetas</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista en Tabla"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tabla</span>
          </button>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          title="Recargar datos"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
        </button>

        {/* Create Combo Button */}
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Combo</span>
        </button>
      </div>
    </div>
  );
}

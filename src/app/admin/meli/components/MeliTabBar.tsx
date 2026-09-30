'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type MeliTabId = 'products' | 'sales' | 'net' | 'config';

export interface MeliTabItem {
  id: MeliTabId;
  label: string;
  icon?: React.ReactNode;
}

interface MeliTabBarProps {
  activeTab: MeliTabId;
  onChange: (tabId: MeliTabId) => void;
  className?: string;
}

const MELI_TABS: MeliTabItem[] = [
  { id: 'products', label: 'Productos' },
  { id: 'sales', label: 'Ventas y productos vendidos' },
  { id: 'net', label: 'Vendido vs Liquidado (Neto)' },
  { id: 'config', label: 'Configuración de Precios' },
];

export const MELI_TAB_ITEMS = MELI_TABS;

export default function MeliTabBar({
  activeTab,
  onChange,
  className,
}: MeliTabBarProps) {
  return (
    <nav
      className={cn(
        'inline-flex items-center gap-1 p-1',
        'rounded-xl bg-slate-200/50',
        className,
      )}
      role="tablist"
      aria-label="Navegación del módulo Mercado Libre"
    >
      {MELI_TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? 'active' : 'inactive'}
            data-value={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center justify-center',
              'px-4 py-2 text-sm font-medium',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              'whitespace-nowrap',
              isActive
                ? cn(
                    'bg-white text-slate-900',
                    'rounded-lg shadow-sm ring-1 ring-black/5',
                  )
                : cn(
                    'text-slate-600 rounded-lg',
                    'hover:text-slate-900 hover:bg-slate-200/50',
                  ),
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

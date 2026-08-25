'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type MeliTabId = 'products' | 'sales' | 'net';

export interface MeliTabItem {
  id: MeliTabId;
  label: string;
  icon?: React.ReactNode;
}

interface MeliTabBarProps {
  activeTab: MeliTabId;
  onChange: (tabId: MeliTabId) => void;
  variant?: 'tabs' | 'pills';
  className?: string;
}

const MELI_TABS: MeliTabItem[] = [
  { id: 'products', label: 'Productos' },
  { id: 'sales', label: 'Ventas y productos vendidos' },
  { id: 'net', label: 'Vendido vs Liquidado (Neto)' },
];

export const MELI_TAB_ITEMS = MELI_TABS;

export default function MeliTabBar({
  activeTab,
  onChange,
  variant = 'tabs',
  className,
}: MeliTabBarProps) {
  return (
    <nav
      className={cn(
        'flex items-center',
        variant === 'pills'
          ? 'flex-wrap gap-2 bg-gray-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-gray-200 dark:border-slate-800'
          : 'border-b border-gray-200 dark:border-slate-800',
        className,
      )}
      role="tablist"
      aria-label="Navegación del módulo Mercado Libre"
    >
      {MELI_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const baseClasses = cn(
          'inline-flex items-center justify-center',
          'px-4 py-2',
          'text-sm font-medium',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        );

        const variantClasses =
          variant === 'pills'
            ? cn(
                'rounded-lg',
                'text-gray-600 dark:text-slate-400',
                'hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm',
                'hover:text-gray-900 dark:hover:text-slate-200',
                'border border-transparent',
                isActive
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow border-blue-100 dark:border-slate-700'
                  : '',
              )
            : cn(
                '-mb-px',
                'text-gray-600 dark:text-slate-400',
                'hover:text-blue-600 dark:hover:text-blue-400',
                isActive
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'border-b-2 border-transparent hover:border-gray-300 dark:hover:border-slate-600',
              );

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? 'active' : 'inactive'}
            data-value={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(baseClasses, variantClasses, tab.icon && 'gap-2')}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

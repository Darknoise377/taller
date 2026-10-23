'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  AppstoreOutlined,
  TagsOutlined,
  DollarCircleOutlined,
  LineChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

export type MeliTabId = 'products' | 'combos' | 'sales' | 'net' | 'config';

export interface MeliTabItem {
  id: MeliTabId;
  label: string;
  icon?: React.ReactNode;
}

interface MeliTabBarProps {
  activeTab: MeliTabId;
  onChange: (tabId: MeliTabId) => void;
  className?: string;
  categoryIssuesCount?: number;
  outOfSyncCount?: number;
}

const MELI_TABS: MeliTabItem[] = [
  { id: 'products', label: 'Productos', icon: <AppstoreOutlined /> },
  { id: 'combos', label: 'Combos', icon: <TagsOutlined /> },
  { id: 'sales', label: 'Ventas y Despachos', icon: <DollarCircleOutlined /> },
  { id: 'net', label: 'Vendido vs Liquidado', icon: <LineChartOutlined /> },
  { id: 'config', label: 'Configuración MeLi', icon: <SettingOutlined /> },
];

export const MELI_TAB_ITEMS = MELI_TABS;

export default function MeliTabBar({
  activeTab,
  onChange,
  className,
  categoryIssuesCount = 0,
  outOfSyncCount = 0,
}: MeliTabBarProps) {
  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-none">
      <nav
        className={cn(
          'inline-flex items-center gap-1.5 p-1.5',
          'rounded-2xl bg-slate-100 border border-slate-200/80 min-w-max',
          className,
        )}
        role="tablist"
        aria-label="Navegación del módulo Mercado Libre"
      >
        {MELI_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showProductBadge =
            tab.id === 'products' && (categoryIssuesCount > 0 || outOfSyncCount > 0);

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
                'inline-flex items-center gap-2',
                'px-4 py-2.5 text-xs sm:text-sm font-semibold',
                'transition-all duration-200 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                'whitespace-nowrap select-none',
                isActive
                  ? cn(
                      'bg-white text-blue-700',
                      'rounded-xl shadow-sm ring-1 ring-slate-900/5',
                    )
                  : cn(
                      'text-slate-600 rounded-xl',
                      'hover:text-slate-900 hover:bg-slate-200/60',
                    ),
              )}
            >
              <span className={cn('text-base', isActive ? 'text-blue-600' : 'text-slate-400')}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {showProductBadge && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {categoryIssuesCount > 0 ? `⚠️ ${categoryIssuesCount}` : outOfSyncCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

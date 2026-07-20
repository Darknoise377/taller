'use client';

import { useState, useCallback } from 'react';
import {
  TruckIcon,
  FireIcon,
  SparklesIcon,
  CheckBadgeIcon,
  CurrencyDollarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

export interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const FILTERS: QuickFilter[] = [
  { id: 'envio-gratis', label: 'Envío gratis', icon: <TruckIcon className="w-4 h-4" /> },
  { id: 'ofertas', label: 'Ofertas', icon: <FireIcon className="w-4 h-4" /> },
  { id: 'nuevos', label: 'Nuevos', icon: <SparklesIcon className="w-4 h-4" /> },
  { id: 'en-stock', label: 'En stock', icon: <CheckBadgeIcon className="w-4 h-4" /> },
  { id: 'menos-50k', label: '<$50.000', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
  { id: '50k-100k', label: '$50k - $100k', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
  { id: 'mas-100k', label: '>$100.000', icon: <CurrencyDollarIcon className="w-4 h-4" /> },
  { id: 'bajaj', label: 'Bajaj', icon: <TagIcon className="w-4 h-4" /> },
  { id: 'ktm', label: 'KTM', icon: <TagIcon className="w-4 h-4" /> },
  { id: 'pulsar', label: 'Pulsar', icon: <TagIcon className="w-4 h-4" /> },
];

interface QuickFiltersProps {
  onFilterChange: (filters: string[]) => void;
  activeFilters?: string[];
}

export default function QuickFilters({ onFilterChange, activeFilters = [] }: QuickFiltersProps) {
  const [active, setActive] = useState<string[]>(activeFilters);

  const toggleFilter = useCallback((filterId: string) => {
    setActive((prev) => {
      const next = prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId];
      onFilterChange(next);
      return next;
    });
  }, [onFilterChange]);

  const clearAll = useCallback(() => {
    setActive([]);
    onFilterChange([]);
  }, [onFilterChange]);

  return (
    <div
      className="py-2"
    >
      <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">
            Filtros:
          </span>

          {/* Scroll container */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1 flex-1">
            {FILTERS.map((filter) => {
              const isActive = active.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => toggleFilter(filter.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border-2 transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0A2A66] border-[#0A2A66] text-white shadow-md shadow-[#0A2A66]/20 dark:bg-[#2E5FA7] dark:border-[#2E5FA7]'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-[#5B9BD5] hover:shadow-sm'
                  }`}
                  aria-pressed={isActive}
                >
                  {filter.icon}
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>

          {/* Clear all */}
          {active.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 text-xs font-medium text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors underline"
            >
              Limpiar
            </button>
          )}
        </div>
    </div>
  );
}

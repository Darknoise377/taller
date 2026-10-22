// src/app/admin/combos/components/ComboTable.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import {
  Gift,
  Flame,
  Sparkles,
  Edit3,
  Copy,
  ExternalLink,
  Trash2,
  Package,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import { AdminCombo } from '../types';
import { formatCurrency } from '@/utils/formatCurrency';

interface ComboTableProps {
  combos: AdminCombo[];
  onEdit: (combo: AdminCombo) => void;
  onDuplicate: (combo: AdminCombo) => void;
  onDelete: (combo: AdminCombo) => void;
  onToggleActive: (combo: AdminCombo) => void;
  onToggleFeatured: (combo: AdminCombo) => void;
}

export default function ComboTable({
  combos,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  onToggleFeatured,
}: ComboTableProps) {
  if (combos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80">
        <Package className="w-10 h-10 text-slate-500 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">No se encontraron combos</h3>
        <p className="text-xs text-slate-400">Intenta cambiar los filtros de búsqueda.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Combo</th>
              <th className="py-3.5 px-4">Productos</th>
              <th className="py-3.5 px-4">Precio & Descuento</th>
              <th className="py-3.5 px-4">Stock</th>
              <th className="py-3.5 px-4">Ventas</th>
              <th className="py-3.5 px-4">Regalo Sorpresa</th>
              <th className="py-3.5 px-4 text-center">Estado</th>
              <th className="py-3.5 px-4 text-center">Destacado</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {combos.map((combo) => {
              const savings = Math.max(0, combo.originalPrice - combo.price);
              const savingsPercent =
                combo.originalPrice > 0
                  ? Math.round((savings / combo.originalPrice) * 100)
                  : 0;

              const isLowStock = combo.stock > 0 && combo.stock <= 3;
              const isOutOfStock = combo.stock <= 0;
              const isExpired = combo.expiresAt ? new Date(combo.expiresAt) <= new Date() : false;

              return (
                <tr
                  key={combo.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Combo Image + Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                        {combo.imageUrl ? (
                          <Image
                            src={combo.imageUrl}
                            alt={combo.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Gift className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                            {combo.name}
                          </span>
                          {combo.badge && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-red-600 text-white">
                              <Flame className="w-2.5 h-2.5" />
                              {combo.badge}
                            </span>
                          )}
                          {combo.meliExport && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              title={combo.meliListing?.meliItemId ? `Sincronizado con MeLi (${combo.meliListing.meliItemId})` : 'Publicado en Mercado Libre'}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              MeLi
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>/{combo.slug}</span>
                          <a
                            href={`/combos/${combo.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-sky-400 transition-colors ml-1"
                            title="Ver en vivo"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Bundled Items */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                        <Layers className="w-3 h-3 text-sky-400" />
                        {combo.items.length} productos
                      </span>
                      <span className="text-[10px] text-slate-400 max-w-[200px] truncate" title={combo.items.map(i => `${i.quantity}x ${i.product?.name}`).join(', ')}>
                        {combo.items.map((i) => `${i.quantity}x ${i.product?.name || 'Prod'}`).join(', ')}
                      </span>
                    </div>
                  </td>

                  {/* Price & Discount */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          {formatCurrency(combo.price, combo.currency as 'COP' | 'USD' | 'EUR')}
                        </span>
                        {combo.originalPrice > combo.price && (
                          <span className="text-slate-500 line-through font-mono text-[11px]">
                            {formatCurrency(combo.originalPrice, combo.currency as 'COP' | 'USD' | 'EUR')}
                          </span>
                        )}
                      </div>
                      {savingsPercent > 0 && (
                        <span className="text-[10px] text-sky-400 font-bold font-mono">
                          -{savingsPercent}% OFF (Ahorra {formatCurrency(savings, 'COP')})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Stock */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isOutOfStock
                            ? 'bg-red-500'
                            : isLowStock
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span
                        className={`font-bold font-mono ${
                          isOutOfStock
                            ? 'text-red-400'
                            : isLowStock
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {combo.stock} un.
                      </span>
                    </div>
                  </td>

                  {/* Orders */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-white font-mono">
                      {combo._count?.orderCombos ?? combo.soldCount ?? 0}
                    </span>
                  </td>

                  {/* Surprise Gift */}
                  <td className="py-3.5 px-4">
                    {combo.surpriseGift ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/40 px-2 py-0.5 rounded-full w-fit">
                          <Gift className="w-2.5 h-2.5" />
                          Sí ({combo.surpriseGift.giftName})
                        </span>
                        {combo.surpriseGift.hint && (
                          <span className="text-[10px] text-purple-400/80 truncate max-w-[140px]">
                            &quot;{combo.surpriseGift.hint}&quot;
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Active Toggle */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleActive(combo)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                        combo.isActive && !isExpired
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                          : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Cambiar visibilidad"
                    >
                      {combo.isActive && !isExpired ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Activo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-500" />
                          {isExpired ? 'Expirado' : 'Pausado'}
                        </>
                      )}
                    </button>
                  </td>

                  {/* Featured Toggle */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleFeatured(combo)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        combo.isFeatured
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                      title={combo.isFeatured ? 'Quitar de destacados' : 'Destacar en home'}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${combo.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(combo)}
                        className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white transition-all"
                        title="Editar combo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(combo)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
                        title="Duplicar combo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(combo)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all"
                        title="Eliminar combo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

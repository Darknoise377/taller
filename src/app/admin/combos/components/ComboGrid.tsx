// src/app/admin/combos/components/ComboGrid.tsx
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
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { AdminCombo } from '../types';
import { formatCurrency } from '@/utils/formatCurrency';

interface ComboGridProps {
  combos: AdminCombo[];
  onEdit: (combo: AdminCombo) => void;
  onDuplicate: (combo: AdminCombo) => void;
  onDelete: (combo: AdminCombo) => void;
  onToggleActive: (combo: AdminCombo) => void;
  onToggleFeatured: (combo: AdminCombo) => void;
}

export default function ComboGrid({
  combos,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
  onToggleFeatured,
}: ComboGridProps) {
  if (combos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-4 text-slate-400">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No se encontraron combos</h3>
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          No hay combos que coincidan con los filtros seleccionados o todavía no has creado ninguno.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
          <div
            key={combo.id}
            className={`group relative flex flex-col rounded-3xl bg-slate-900/90 border transition-all duration-300 hover:shadow-2xl hover:shadow-sky-500/10 hover:-translate-y-1 overflow-hidden ${
              combo.isActive && !isExpired
                ? combo.isFeatured
                  ? 'border-amber-500/40 shadow-amber-500/5'
                  : 'border-slate-800 hover:border-slate-700'
                : 'border-slate-800/60 opacity-85'
            }`}
          >
            {/* Top Media Section */}
            <div className="relative h-52 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
              {combo.imageUrl ? (
                <Image
                  src={combo.imageUrl}
                  alt={combo.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600">
                  <Gift className="w-16 h-16 opacity-40 mb-2" />
                  <span className="text-xs font-semibold">Sin imagen cargada</span>
                </div>
              )}

              {/* Overlay Gradient for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-black/40 pointer-events-none" />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                {combo.badge && (
                  <span className="inline-flex items-center gap-1 bg-red-600/95 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm tracking-wide">
                    <Flame className="w-3.5 h-3.5" />
                    {combo.badge.toUpperCase()}
                  </span>
                )}
                {savingsPercent > 0 && (
                  <span className="inline-flex items-center bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-md">
                    -{savingsPercent}% OFF
                  </span>
                )}
                {combo.isFeatured && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                    <Sparkles className="w-3 h-3 fill-current" />
                    DESTACADO EN HOME
                  </span>
                )}
              </div>

              {/* Top Right Quick Badges */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                {combo.images && combo.images.length > 1 && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/60 text-slate-300 backdrop-blur-md border border-white/10">
                    +{combo.images.length} fotos
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold backdrop-blur-md shadow-md ${
                    combo.isActive && !isExpired
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {combo.isActive && !isExpired ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Activo
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      {isExpired ? 'Expirado' : 'Pausado'}
                    </>
                  )}
                </span>
              </div>

              {/* Expiration warning banner on image bottom */}
              {combo.expiresAt && (
                <div
                  className={`absolute bottom-0 inset-x-0 px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md ${
                    isExpired
                      ? 'bg-rose-950/80 text-rose-300 border-t border-rose-800/50'
                      : 'bg-amber-950/80 text-amber-300 border-t border-amber-800/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isExpired
                      ? `Expiró el ${new Date(combo.expiresAt).toLocaleDateString('es-CO')}`
                      : `Expira: ${new Date(combo.expiresAt).toLocaleDateString('es-CO')} ${new Date(combo.expiresAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="flex flex-col flex-1 p-5 gap-3.5">
              {/* Header: Title & Slug */}
              <div>
                <h3 className="font-bold text-lg text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                  {combo.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-slate-400 truncate">
                    /{combo.slug}
                  </span>
                  <a
                    href={`/combos/${combo.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-sky-400 transition-colors"
                    title="Ver en la tienda en vivo"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Description preview */}
              {combo.description && (
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  {combo.description}
                </p>
              )}

              {/* Products included breakdown */}
              <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    Productos incluidos ({combo.items.length})
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {combo.items.reduce((acc, i) => acc + i.quantity, 0)} unidades en total
                  </span>
                </div>

                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                  {combo.items.map((item, idx) => (
                    <div
                      key={item.id ?? idx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-sky-950 border border-sky-800/60 text-sky-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="text-slate-200 truncate font-medium">
                          {item.product?.name ?? 'Producto no encontrado'}
                        </span>
                      </div>
                      {item.product?.price && (
                        <span className="text-slate-400 text-[11px] shrink-0 font-mono ml-2">
                          {formatCurrency(item.product.price * item.quantity, 'COP')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Surprise Gift Banner (if exists) */}
              {combo.surpriseGift && (
                <div className="relative overflow-hidden p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-900/20 border border-purple-500/30 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-200">Regalo Sorpresa Incluido</span>
                        {combo.surpriseGift.giftValue && (
                          <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-900/60 px-1.5 py-0.5 rounded">
                            Valor ~{formatCurrency(combo.surpriseGift.giftValue, 'COP')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-purple-300/90 mt-0.5 truncate">
                        Pista al cliente: &quot;{combo.surpriseGift.hint || 'Regalo especial'}&quot;
                      </p>
                      <p className="text-[10px] text-purple-400 font-mono mt-0.5">
                        Interno: {combo.surpriseGift.giftName}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Price & Savings Display */}
              <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Precio Combo
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      {formatCurrency(combo.price, combo.currency as 'COP' | 'USD' | 'EUR')}
                    </span>
                    {combo.originalPrice > combo.price && (
                      <span className="text-xs text-slate-500 line-through font-mono">
                        {formatCurrency(combo.originalPrice, combo.currency as 'COP' | 'USD' | 'EUR')}
                      </span>
                    )}
                  </div>
                </div>

                {savings > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider block">
                      Ahorro Cliente
                    </span>
                    <span className="text-xs font-bold text-sky-300 font-mono bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/40">
                      +{formatCurrency(savings, 'COP')}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock and Sales Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
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
                  <span className="text-slate-400">Stock:</span>
                  <span
                    className={`font-bold font-mono ${
                      isOutOfStock
                        ? 'text-red-400'
                        : isLowStock
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {combo.stock} un.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 text-slate-400">
                  <span>Ventas:</span>
                  <span className="font-bold text-white font-mono">
                    {combo._count?.orderCombos ?? combo.soldCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Fast Inline Toggles */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs text-slate-300">
                {/* Active Toggle */}
                <button
                  type="button"
                  onClick={() => onToggleActive(combo)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                    combo.isActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="Cambiar estado activo"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${combo.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`}
                  />
                  <span className="text-[11px] font-semibold">
                    {combo.isActive ? 'Publicado' : 'Pausado'}
                  </span>
                </button>

                {/* Featured Toggle */}
                <button
                  type="button"
                  onClick={() => onToggleFeatured(combo)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                    combo.isFeatured
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="Destacar en Home"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${combo.isFeatured ? 'text-amber-400 fill-amber-400' : ''}`} />
                  <span className="text-[11px] font-semibold">
                    {combo.isFeatured ? 'Destacado' : 'Normal'}
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => onEdit(combo)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicate(combo)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                  title="Duplicar combo"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(combo)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all"
                  title="Eliminar combo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

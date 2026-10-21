// src/app/admin/combos/components/ComboDeleteModal.tsx
'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { AdminCombo } from '../types';

interface ComboDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  combo: AdminCombo | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export default function ComboDeleteModal({
  isOpen,
  onClose,
  combo,
  onConfirm,
  isDeleting,
}: ComboDeleteModalProps) {
  if (!isOpen || !combo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">¿Eliminar este combo?</h3>
            <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 mb-5 text-xs text-slate-300">
          <p className="font-semibold text-white mb-0.5">{combo.name}</p>
          <p className="text-slate-400 font-mono text-[11px]">/{combo.slug}</p>
          {combo._count?.orderCombos ? (
            <p className="mt-2 text-amber-400 font-medium">
              Nota: Este combo está vinculado a {combo._count.orderCombos} pedidos históricos.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Combo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import type { SellerCode as Seller, PromotionCode as Promotion } from '@/types/code';
import * as codeService from '@/services/codeService';
import { toast } from 'sonner';
import { Pencil, Trash2, X } from 'lucide-react';

const initialSellerState = { name: '', code: '' };
const initialPromoState = { code: '', description: '', discount: 0 };

export default function AdminCodesPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [newSeller, setNewSeller] = useState(initialSellerState);
  const [newPromo, setNewPromo] = useState(initialPromoState);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ type: 'seller' | 'promo'; id: string; name: string } | null>(null);

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    return 'Ocurrió un error inesperado';
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await codeService.getAllCodes();
      setSellers(data.sellers || []);
      setPromotions(data.promotions || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // --- Sellers ---
  const handleSellerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSeller((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSeller = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await codeService.createSeller({ ...newSeller, code: newSeller.code.toUpperCase() });
      toast.success('Vendedor creado');
      setNewSeller(initialSellerState);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdateSeller = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSeller) return;
    try {
      await codeService.updateSeller(editingSeller.id, {
        name: newSeller.name,
        code: newSeller.code.toUpperCase(),
      });
      toast.success('Vendedor actualizado');
      setEditingSeller(null);
      setNewSeller(initialSellerState);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteSeller = async (id: string) => {
    try {
      await codeService.deleteSeller(id);
      toast.success('Vendedor eliminado');
      setDeleting(null);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  // --- Promotions ---
  const handlePromoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewPromo((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCreatePromo = async (e: FormEvent) => {
    e.preventDefault();
    if (newPromo.discount <= 0 || newPromo.discount > 100) {
      toast.warning('El descuento debe ser entre 1 y 100');
      return;
    }
    try {
      await codeService.createPromotion({ ...newPromo, code: newPromo.code.toUpperCase() });
      toast.success('Promoción creada');
      setNewPromo(initialPromoState);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdatePromo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;
    if (newPromo.discount <= 0 || newPromo.discount > 100) {
      toast.warning('El descuento debe ser entre 1 y 100');
      return;
    }
    try {
      await codeService.updatePromotion(editingPromo.id, {
        code: newPromo.code.toUpperCase(),
        description: newPromo.description,
        discount: newPromo.discount,
      });
      toast.success('Promoción actualizada');
      setEditingPromo(null);
      setNewPromo(initialPromoState);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      await codeService.deletePromotion(id);
      toast.success('Promoción eliminada');
      setDeleting(null);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const startEditSeller = (seller: Seller) => {
    setEditingSeller(seller);
    setNewSeller({ name: seller.name, code: seller.code });
  };

  const startEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setNewPromo({ code: promo.code, description: promo.description, discount: promo.discount });
  };

  const cancelEdit = () => {
    setEditingSeller(null);
    setEditingPromo(null);
    setNewSeller(initialSellerState);
    setNewPromo(initialPromoState);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-slate-600 border-t-[#0A2A66]" />
      </div>
    );
  }

  const inputClass = "mt-1 w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-slate-300";

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-slate-100">Administrar Códigos</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4" role="alert">
          {error}
          <button onClick={loadData} className="ml-3 underline text-sm">Reintentar</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sellers */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-gray-800 dark:text-slate-100">Vendedores</h2>

          <form onSubmit={editingSeller ? handleUpdateSeller : handleCreateSeller} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 dark:text-slate-100">
                {editingSeller ? 'Editar Vendedor' : 'Crear Vendedor'}
              </h3>
              {editingSeller && (
                <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                  <X size={18} />
                </button>
              )}
            </div>
            <div>
              <label className={labelClass}>Nombre</label>
              <input type="text" name="name" value={newSeller.name} onChange={handleSellerChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Código</label>
              <input type="text" name="code" value={newSeller.code} onChange={handleSellerChange} required className={inputClass} />
            </div>
            <button type="submit" className="w-full bg-[#0A2A66] text-white py-2 rounded-lg hover:bg-[#0A2A66]/90 transition-colors font-medium">
              {editingSeller ? 'Guardar Cambios' : 'Crear Vendedor'}
            </button>
          </form>

          {sellers.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-slate-500 py-6">No hay vendedores</p>
          ) : (
            <div className="space-y-2">
              {sellers.map((seller) => (
                <div key={seller.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                  <span className="min-w-0">
                    <strong className="block truncate text-gray-800 dark:text-slate-100">{seller.name}</strong>
                    <span className="text-sm text-gray-500 dark:text-slate-400 font-mono">{seller.code}</span>
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditSeller(seller)} className="text-[#0A2A66] dark:text-blue-400 hover:underline p-1" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleting({ type: 'seller', id: seller.id, name: seller.name })} className="text-red-500 hover:text-red-700 p-1" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Promotions */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 dark:border-slate-700 pb-2 text-gray-800 dark:text-slate-100">Promociones</h2>

          <form onSubmit={editingPromo ? handleUpdatePromo : handleCreatePromo} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 dark:text-slate-100">
                {editingPromo ? 'Editar Promoción' : 'Crear Promoción'}
              </h3>
              {editingPromo && (
                <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                  <X size={18} />
                </button>
              )}
            </div>
            <div>
              <label className={labelClass}>Código</label>
              <input type="text" name="code" value={newPromo.code} onChange={handlePromoChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <input type="text" name="description" value={newPromo.description} onChange={handlePromoChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Descuento (1-100%)</label>
              <input type="number" name="discount" min={1} max={100} value={newPromo.discount} onChange={handlePromoChange} required className={inputClass} />
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium">
              {editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}
            </button>
          </form>

          {promotions.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-slate-500 py-6">No hay promociones</p>
          ) : (
            <div className="space-y-2">
              {promotions.map((promo) => (
                <div key={promo.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                  <div className="min-w-0">
                    <span className="block truncate text-gray-800 dark:text-slate-100">
                      <strong className="font-mono">{promo.code}</strong>
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">{promo.discount}%</span>
                    </span>
                    <span className="text-sm text-gray-500 dark:text-slate-400 block truncate">{promo.description}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEditPromo(promo)} className="text-[#0A2A66] dark:text-blue-400 hover:underline p-1" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleting({ type: 'promo', id: promo.id, name: promo.code })} className="text-red-500 hover:text-red-700 p-1" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl w-[92vw] max-w-sm shadow-lg border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-4 text-center text-red-600">
              Confirmar eliminación
            </h2>
            <p className="text-center mb-4 text-gray-700 dark:text-slate-300">
              ¿Seguro que deseas eliminar <b>{deleting.name}</b>?
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setDeleting(null)} className="text-gray-600 dark:text-slate-400 hover:underline">
                Cancelar
              </button>
              <button
                onClick={() => deleting.type === 'seller' ? handleDeleteSeller(deleting.id) : handleDeletePromo(deleting.id)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
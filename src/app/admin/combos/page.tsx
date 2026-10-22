// src/app/admin/combos/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { Loader2 } from 'lucide-react';
import { AdminCombo, FilterStatus, ProductOption, SortOption, ViewMode } from './types';
import ComboHeader from './components/ComboHeader';
import ComboStats from './components/ComboStats';
import ComboFilters from './components/ComboFilters';
import ComboGrid from './components/ComboGrid';
import ComboTable from './components/ComboTable';
import ComboModal from './components/ComboModal';
import ComboDeleteModal from './components/ComboDeleteModal';

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<AdminCombo[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters and views
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recent');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<AdminCombo | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [comboToDelete, setComboToDelete] = useState<AdminCombo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load view mode preference and URL filters
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_combos_view_mode') as ViewMode | null;
      if (saved === 'grid' || saved === 'table') {
        setViewMode(saved);
      }
      const params = new URLSearchParams(window.location.search);
      const f = params.get('filter') as FilterStatus;
      if (f && ['all', 'active', 'inactive', 'featured', 'expired', 'gift', 'low_stock', 'meli'].includes(f)) {
        setStatus(f);
      }
    } catch {}
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('admin_combos_view_mode', mode);
    } catch {}
  };

  // Load Combos
  const loadCombos = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/combos');
      if (!res.ok) throw new Error('Error al cargar combos');
      const data = await res.json();
      setCombos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error('No se pudieron cargar los combos');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load Products
  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products?all=true&limit=500');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.items ?? [];
      setProducts(
        list.map((p: { id: string; name: string; price: number; stock: number; category?: string; sku?: string }) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          category: p.category,
          sku: p.sku,
        }))
      );
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadCombos();
    loadProducts();
  }, [loadCombos, loadProducts]);

  // Open Create
  const handleOpenCreate = () => {
    setEditingCombo(null);
    setModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (combo: AdminCombo) => {
    setEditingCombo(combo);
    setModalOpen(true);
  };

  // Open Delete
  const handleOpenDelete = (combo: AdminCombo) => {
    setComboToDelete(combo);
    setDeleteModalOpen(true);
  };

  // Save Combo (Create / Edit)
  const handleSaveCombo = async (payload: Partial<AdminCombo>) => {
    setIsSaving(true);
    try {
      const url = editingCombo ? `/api/admin/combos/${editingCombo.id}` : '/api/admin/combos';
      const method = editingCombo ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el combo');
      }

      message.success(editingCombo ? '✨ Combo actualizado con éxito' : '🎉 Combo creado con éxito');
      setModalOpen(false);
      loadCombos(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicate Combo
  const handleDuplicateCombo = async (combo: AdminCombo) => {
    const key = `dup-${combo.id}`;
    message.loading({ content: 'Duplicando combo...', key });
    try {
      const res = await fetch(`/api/admin/combos/${combo.id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al duplicar');

      message.success({ content: 'Combo duplicado exitosamente (en estado pausado)', key });
      loadCombos(true);
    } catch (err) {
      message.error({ content: (err as Error).message || 'Error al duplicar combo', key });
    }
  };

  // Fast In-Place Toggle: Active Status
  const handleToggleActive = async (combo: AdminCombo) => {
    const nextState = !combo.isActive;
    // Optimistic update
    setCombos((prev) =>
      prev.map((c) => (c.id === combo.id ? { ...c, isActive: nextState } : c))
    );

    try {
      const res = await fetch(`/api/admin/combos/${combo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextState }),
      });
      if (!res.ok) throw new Error();
      message.success(nextState ? 'Combo activado en tienda' : 'Combo pausado');
    } catch {
      // Rollback
      setCombos((prev) =>
        prev.map((c) => (c.id === combo.id ? { ...c, isActive: !nextState } : c))
      );
      message.error('Error al actualizar estado del combo');
    }
  };

  // Fast In-Place Toggle: Featured Status
  const handleToggleFeatured = async (combo: AdminCombo) => {
    const nextState = !combo.isFeatured;
    // Optimistic update
    setCombos((prev) =>
      prev.map((c) => (c.id === combo.id ? { ...c, isFeatured: nextState } : c))
    );

    try {
      const res = await fetch(`/api/admin/combos/${combo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: nextState }),
      });
      if (!res.ok) throw new Error();
      message.success(nextState ? 'Combo destacado en página principal' : 'Combo retirado de destacados');
    } catch {
      // Rollback
      setCombos((prev) =>
        prev.map((c) => (c.id === combo.id ? { ...c, isFeatured: !nextState } : c))
      );
      message.error('Error al actualizar estado de destacado');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!comboToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/combos/${comboToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();

      message.success('Combo eliminado correctamente');
      setCombos((prev) => prev.filter((c) => c.id !== comboToDelete.id));
      setDeleteModalOpen(false);
      setComboToDelete(null);
    } catch {
      message.error('Error al eliminar combo');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Sort Logic
  const filteredCombos = useMemo(() => {
    let result = [...combos];
    const now = new Date();

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.badge && c.badge.toLowerCase().includes(q)) ||
          c.items.some((i) => i.product?.name.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (status === 'active') {
      result = result.filter((c) => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > now));
    } else if (status === 'inactive') {
      result = result.filter((c) => !c.isActive);
    } else if (status === 'featured') {
      result = result.filter((c) => c.isFeatured);
    } else if (status === 'gift') {
      result = result.filter((c) => !!c.surpriseGift);
    } else if (status === 'low_stock') {
      result = result.filter((c) => c.stock <= 3);
    } else if (status === 'expired') {
      result = result.filter((c) => !!c.expiresAt && new Date(c.expiresAt) <= now);
    } else if (status === 'meli') {
      result = result.filter((c) => Boolean(c.meliExport) || Boolean(c.meliListing?.meliItemId));
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === 'sales') {
        const salesA = a._count?.orderCombos ?? a.soldCount ?? 0;
        const salesB = b._count?.orderCombos ?? b.soldCount ?? 0;
        return salesB - salesA;
      }
      if (sortOption === 'discount') {
        const pctA = a.savingsPercent ?? (a.originalPrice > 0 ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0);
        const pctB = b.savingsPercent ?? (b.originalPrice > 0 ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0);
        return pctB - pctA;
      }
      if (sortOption === 'stock_asc') {
        return a.stock - b.stock;
      }
      if (sortOption === 'price_desc') {
        return b.price - a.price;
      }
      if (sortOption === 'price_asc') {
        return a.price - b.price;
      }
      return 0;
    });

    return result;
  }, [combos, searchTerm, status, sortOption]);

  const activeCount = combos.filter((c) => c.isActive && !c.isExpired).length;

  return (
    <div className="min-h-screen bg-[#07122E] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <ComboHeader
        totalCombos={combos.length}
        activeCombos={activeCount}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenCreate={handleOpenCreate}
        onRefresh={() => loadCombos(false)}
        isRefreshing={isRefreshing}
      />

      {/* KPI Stats */}
      <ComboStats
        combos={combos}
        currentStatus={status}
        onSelectStatus={setStatus}
      />

      {/* Filters & Search */}
      <ComboFilters
        combos={combos}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        status={status}
        onStatusChange={setStatus}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onReset={() => {
          setSearchTerm('');
          setStatus('all');
          setSortOption('recent');
        }}
      />

      {/* Main Content: Loading or Grid / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-300">Cargando catálogo de combos...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <ComboGrid
          combos={filteredCombos}
          onEdit={handleOpenEdit}
          onDuplicate={handleDuplicateCombo}
          onDelete={handleOpenDelete}
          onToggleActive={handleToggleActive}
          onToggleFeatured={handleToggleFeatured}
        />
      ) : (
        <ComboTable
          combos={filteredCombos}
          onEdit={handleOpenEdit}
          onDuplicate={handleDuplicateCombo}
          onDelete={handleOpenDelete}
          onToggleActive={handleToggleActive}
          onToggleFeatured={handleToggleFeatured}
        />
      )}

      {/* Create / Edit Modal */}
      <ComboModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        combo={editingCombo}
        products={products}
        onSave={handleSaveCombo}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Modal */}
      <ComboDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setComboToDelete(null);
        }}
        combo={comboToDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

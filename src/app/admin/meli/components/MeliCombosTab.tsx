'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Input,
  Segmented,
  Tooltip,
  message,
  Popconfirm,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExportOutlined,
  EditOutlined,
  PlusOutlined,
  ShopOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency } from '@/utils/formatCurrency';
import type { AdminCombo } from '@/app/admin/combos/types';
import type { MeliStatus } from '../types';
import { hasForbiddenWords } from '@/utils/meliSanitizer';

interface MeliCombosTabProps {
  status: MeliStatus | null;
}

export default function MeliCombosTab({ status }: MeliCombosTabProps) {
  const [combos, setCombos] = useState<AdminCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'synced' | 'pending' | 'unconfigured'>('all');
  const [syncingAll, setSyncingAll] = useState(false);

  const handleBulkSyncCombos = async (onlyPending = false) => {
    setSyncingAll(true);
    message.loading({ content: 'Sincronizando combos con Mercado Libre...', key: 'bulk-combo-sync' });
    try {
      const res = await fetch('/api/meli/sync/combo/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyPending }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la sincronización masiva');
      message.success({
        content: `¡Sincronización completada! ${data.synced} combo(s) sincronizados con éxito. 🚀`,
        key: 'bulk-combo-sync',
      });
      if (data.errors?.length > 0) {
        message.warning(`${data.errors.length} combo(s) tuvieron advertencias al publicar.`);
      }
      await loadCombos();
    } catch (err) {
      message.error({ content: (err as Error).message || 'Error en sincronización masiva', key: 'bulk-combo-sync' });
    } finally {
      setSyncingAll(false);
    }
  };

  const loadCombos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/combos');
      if (!res.ok) throw new Error('Error al cargar combos');
      const data = await res.json();
      setCombos(Array.isArray(data) ? data : []);
    } catch {
      message.error('No se pudieron cargar los combos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  // Handle single sync
  const handleSyncCombo = async (comboId: string) => {
    setSyncingId(comboId);
    try {
      const res = await fetch(`/api/meli/sync/combo/${comboId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar con Mercado Libre');
      message.success('¡Combo sincronizado con éxito en Mercado Libre! 🚀');
      await loadCombos();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSyncingId(null);
    }
  };

  // Compute compound stock
  const getCompoundStock = (combo: AdminCombo) => {
    if (!combo.items || combo.items.length === 0) return 0;
    const itemLimits = combo.items.map((item) => {
      const pStock = item.product?.stock ?? 0;
      return Math.floor(pStock / Math.max(1, item.quantity));
    });
    return Math.max(0, Math.min(combo.stock, ...itemLimits));
  };

  // Compute financial details
  const getMeliPricing = (combo: AdminCombo) => {
    const commissionRate = combo.meliListingType === 'gold_premium' ? 18.5 : 16.5;
    const fixedCost = 3500;
    const shippingCost = 10000;
    const rawBase = combo.price > 0 ? (combo.price + fixedCost) / (1 - commissionRate / 100) : 0;
    const hasFreeShipping = rawBase >= 60000 || combo.price >= 60000;
    const appliedShipping = hasFreeShipping ? shippingCost : 0;
    const simulatedPrice = combo.price > 0
      ? Math.ceil((combo.price + fixedCost + appliedShipping) / (1 - commissionRate / 100) / 100) * 100
      : 0;
    return {
      commissionRate,
      hasFreeShipping,
      simulatedPrice,
      shippingCost: appliedShipping,
    };
  };

  // Filtered Combos
  const filteredCombos = useMemo(() => {
    return combos.filter((combo) => {
      const isSynced = Boolean(combo.meliListing?.meliItemId);
      const isPending = combo.meliExport && !isSynced;
      const isUnconfigured = !combo.meliExport && !isSynced;

      if (filterState === 'synced' && !isSynced) return false;
      if (filterState === 'pending' && !isPending) return false;
      if (filterState === 'unconfigured' && !isUnconfigured) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = combo.name.toLowerCase().includes(q);
        const matchesMeliTitle = combo.meliTitle?.toLowerCase().includes(q);
        const matchesMeliId = combo.meliListing?.meliItemId.toLowerCase().includes(q);
        if (!matchesName && !matchesMeliTitle && !matchesMeliId) return false;
      }

      return true;
    });
  }, [combos, filterState, searchTerm]);

  // Summary counts
  const summary = useMemo(() => {
    const total = combos.length;
    const synced = combos.filter((c) => Boolean(c.meliListing?.meliItemId)).length;
    const pending = combos.filter((c) => c.meliExport && !c.meliListing?.meliItemId).length;
    const unconfigured = total - synced - pending;
    return { total, synced, pending, unconfigured };
  }, [combos]);

  // Columns
  const columns: ColumnsType<AdminCombo> = [
    {
      title: 'Combo',
      key: 'combo',
      render: (_, combo) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
            {combo.imageUrl ? (
              <Image
                src={combo.imageUrl}
                alt={combo.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <ShopOutlined />
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">{combo.name}</div>
            <div className="text-xs text-slate-500">
              {combo.items?.length ?? 0} {combo.items?.length === 1 ? 'producto' : 'productos'} incluidos
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Título MeLi',
      key: 'meliTitle',
      render: (_, combo) => {
        const title = combo.meliTitle || combo.name;
        const hasWarning = hasForbiddenWords(title);
        const isTooLong = title.length > 60;

        return (
          <div className="max-w-[280px]">
            <div className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 font-medium">
              {title}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] ${isTooLong ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                {title.length}/60 car.
              </span>
              {hasWarning && (
                <Tooltip title="Contiene palabras promocionales restringidas por MeLi (oferta, descuento, gratis)">
                  <Tag color="red" className="text-[10px] mr-0">
                    Palabra prohibida
                  </Tag>
                </Tooltip>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Stock Compuesto',
      key: 'stock',
      align: 'center',
      render: (_, combo) => {
        const compoundStock = getCompoundStock(combo);
        return (
          <div>
            <div className={`font-mono font-bold text-sm ${compoundStock <= 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
              {compoundStock}
            </div>
            <div className="text-[10px] text-slate-400">disponibles</div>
          </div>
        );
      },
    },
    {
      title: 'Precios',
      key: 'pricing',
      render: (_, combo) => {
        const { simulatedPrice, hasFreeShipping, commissionRate } = getMeliPricing(combo);
        return (
          <div>
            <div className="text-xs text-slate-500">
              Tienda: <span className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(combo.price, 'COP')}</span>
            </div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
              PVP MeLi: {formatCurrency(simulatedPrice, 'COP')}
            </div>
            <div className="text-[10px] text-slate-400">
              Comisión {commissionRate}% {hasFreeShipping ? '+ Flete 10k' : '+ $3.5k fijo'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Estado MeLi',
      key: 'status',
      render: (_, combo) => {
        if (combo.meliListing?.meliItemId) {
          return (
            <div className="flex flex-col gap-1 items-start">
              <Tag color="green" icon={<CheckCircleOutlined />} className="text-xs">
                {combo.meliListing.meliItemId}
              </Tag>
              {combo.meliListing.meliPermalink && (
                <a
                  href={combo.meliListing.meliPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  <span>Ver publicación</span>
                  <ExportOutlined />
                </a>
              )}
            </div>
          );
        }

        if (combo.meliExport) {
          return (
            <Tag color="orange" icon={<SyncOutlined spin={syncingId === combo.id} />} className="text-xs">
              Listo para publicar
            </Tag>
          );
        }

        return (
          <Tag color="default" className="text-xs text-slate-400">
            No exportado
          </Tag>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      align: 'right',
      render: (_, combo) => {
        const isConnected = Boolean(status?.connected);
        const compoundStock = getCompoundStock(combo);
        const canSync = isConnected && combo.items?.length > 0 && compoundStock > 0;

        return (
          <div className="flex items-center justify-end gap-2">
            <Popconfirm
              title={combo.meliListing?.meliItemId ? '¿Republicar/Actualizar en Mercado Libre?' : '¿Publicar combo en Mercado Libre?'}
              description={
                !canSync
                  ? 'Verifica que la cuenta MeLi esté conectada y que el combo tenga repuestos con stock disponible.'
                  : 'Se calculará el precio con comisiones y flete protegido para Mercado Libre.'
              }
              onConfirm={() => handleSyncCombo(combo.id)}
              okText="Publicar / Sincronizar"
              cancelText="Cancelar"
              disabled={!canSync || syncingId === combo.id}
            >
              <Button
                size="small"
                type="primary"
                className="bg-amber-500 hover:bg-amber-600 border-none font-semibold text-slate-900"
                icon={<SyncOutlined spin={syncingId === combo.id} />}
                loading={syncingId === combo.id}
                disabled={!canSync}
              >
                {combo.meliListing?.meliItemId ? 'Actualizar' : 'Publicar'}
              </Button>
            </Popconfirm>

            <Link href="/admin/combos">
              <Button size="small" icon={<EditOutlined />} title="Editar combo y configuración MeLi" />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" className="shadow-sm border-slate-200">
            <div className="text-xs uppercase font-semibold text-slate-500">Total Combos</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.total}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <div className="text-xs uppercase font-semibold text-emerald-700">Publicados en MeLi</div>
            <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
              <CheckCircleOutlined />
              {summary.synced}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="shadow-sm border-amber-200 bg-amber-50/30">
            <div className="text-xs uppercase font-semibold text-amber-700">Listos / Pendientes</div>
            <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
              <SyncOutlined />
              {summary.pending}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="shadow-sm border-slate-200">
            <div className="text-xs uppercase font-semibold text-slate-400">Sin Exportar</div>
            <div className="text-2xl font-bold text-slate-500">{summary.unconfigured}</div>
          </Card>
        </Col>
      </Row>

      {/* ── Main Combos Table Card ── */}
      <Card
        className="shadow-sm border-slate-200"
        title={
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Combos para Mercado Libre
            </span>
            <Tag color="gold" className="font-semibold text-xs">
              Estrategia Paquetes Blindados
            </Tag>
          </div>
        }
        extra={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Popconfirm
              title="¿Sincronizar todos los combos en Mercado Libre?"
              description="Se calculará el precio blindado y stock compuesto para todos los combos configurados para MeLi."
              onConfirm={() => handleBulkSyncCombos(false)}
              okText="Sincronizar Todos"
              cancelText="Cancelar"
              disabled={syncingAll || !status?.connected}
            >
              <Button
                type="primary"
                className="bg-amber-500 hover:bg-amber-600 border-none font-semibold text-slate-900"
                icon={<SyncOutlined spin={syncingAll} />}
                loading={syncingAll}
                disabled={!status?.connected || summary.total === 0}
              >
                Sincronizar Masivo MeLi
              </Button>
            </Popconfirm>

            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={loadCombos}
              loading={loading}
            >
              Actualizar
            </Button>
            <Link href="/admin/combos">
              <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600">
                Administrar Combos
              </Button>
            </Link>
          </div>
        }
      >
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <Segmented
            value={filterState}
            onChange={(val) => setFilterState(val as typeof filterState)}
            options={[
              { label: `Todos (${summary.total})`, value: 'all' },
              { label: `Sincronizados (${summary.synced})`, value: 'synced' },
              { label: `Listos (${summary.pending})`, value: 'pending' },
              { label: `Sin Exportar (${summary.unconfigured})`, value: 'unconfigured' },
            ]}
          />

          <Input.Search
            placeholder="Buscar por nombre, título MeLi o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm:w-72"
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredCombos}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{
            emptyText: (
              <div className="py-12 text-center text-slate-400">
                <ShopOutlined className="text-3xl mb-2" />
                <p>No se encontraron combos con los filtros seleccionados.</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}

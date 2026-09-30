'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Form,
  message,
  Spin,
  Typography,
  ConfigProvider,
  Divider,
  Tag,
   Tooltip,
   Button,
   Modal,
 } from 'antd';
 import {
   CheckCircleOutlined,
   CloseCircleOutlined,
   ExclamationCircleOutlined,
   SyncOutlined,
   EditOutlined,
 } from '@ant-design/icons';
import 'dayjs/locale/es';
import esES from 'antd/locale/es_ES';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency } from '@/utils/formatCurrency';
import { previewPrices, MELI_COMMISSION_RATES } from '@/lib/meli/pricing';
import type { MeliSyncFilter } from '@/lib/meli/listingStatus';

import MeliTabBar from './components/MeliTabBar';
import type { MeliTabId } from './components/MeliTabBar';
import MeliProductsTab from './components/MeliProductsTab';
import MeliSalesTab from './components/MeliSalesTab';
import MeliNetReportTab from './components/MeliNetReportTab';
import MeliConfigTab from './components/MeliConfigTab';

import type {
  MeliStatus,
  MeliConfig,
  ListingRow,
  ListingsSummary,
  MeliOrderRow,
} from './types';

const { Title, Text, Paragraph } = Typography;

function healthIcon(health?: string) {
  if (health === 'ok') return <CheckCircleOutlined className="text-green-600" />;
  if (health === 'warning') return <ExclamationCircleOutlined className="text-amber-500" />;
  if (health === 'error') return <CloseCircleOutlined className="text-red-500" />;
  return <ExclamationCircleOutlined className="text-slate-400" />;
}

export default function AdminMeliPage() {
  const [status, setStatus] = useState<MeliStatus | null>(null);
  const [config, setConfig] = useState<MeliConfig | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [summary, setSummary] = useState<ListingsSummary | null>(null);
  const [syncFilter, setSyncFilter] = useState<MeliSyncFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<MeliOrderRow[]>([]);
  const [orderDateRange, setOrderDateRange] = useState<[string, string] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingPending, setSyncingPending] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [syncingRow, setSyncingRow] = useState<string | null>(null);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<MeliTabId>('products');
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  const [form] = Form.useForm<Omit<MeliConfig, 'id' | 'categoryMap'>>();

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/meli/status');
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/meli/config');
      if (res.ok) {
        const cfg: MeliConfig = await res.json();
        setConfig(cfg);
        form.setFieldsValue({
          extraMarginPercent: cfg.extraMarginPercent,
          fixedCostCOP: cfg.fixedCostCOP,
          defaultListingType: cfg.defaultListingType,
          freeInstallments: cfg.freeInstallments ?? 3,
        });
      }
    } catch { /* ignore */ }
  }, [form]);

  const loadListings = useCallback(async (refreshLive = false) => {
    try {
      const qs = refreshLive ? '?refresh=1' : '';
      const res = await fetch(`/api/meli/listings${qs}`);
      if (!res.ok) {
        const err = await res.json();
        message.error(err.error ?? 'No se pudo cargar el catálogo MeLi');
        return;
      }
      const data: { items: ListingRow[]; summary: ListingsSummary } = await res.json();
      setListings(data.items ?? []);
      setSummary(data.summary ?? null);
    } catch {
      message.error('Error de red al cargar publicaciones');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/admin/meli/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const handleSyncOrdersFromMeli = useCallback(async () => {
    if (!status?.connected) {
      message.warning('Conecta MeLi primero');
      return;
    }
    setSyncingOrders(true);
    try {
      const res = await fetch('/api/admin/meli/orders', { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        message.success(`Órdenes importadas: ${body.synced} nueva(s)`);
        await loadOrders();
      } else {
        message.error(body.error ?? 'Error al importar órdenes');
      }
    } catch {
      message.error('Error de red al importar órdenes');
    } finally {
      setSyncingOrders(false);
    }
  }, [status, loadOrders]);

  const handleConnect = () => {
    window.location.href = '/api/meli/auth';
  };

  const handleDisconnect = async () => {
    const res = await fetch('/api/meli/status', { method: 'DELETE' });
    if (res.ok) {
      message.success('Cuenta MeLi desconectada');
      setStatus({ connected: false });
    } else {
      message.error('Error al desconectar');
    }
  };

  const handleSaveConfig = async () => {
    try {
      const values = await form.validateFields();
      setConfigLoading(true);
      const res = await fetch('/api/meli/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        const updated: MeliConfig = await res.json();
        setConfig(updated);
        message.success('Configuración guardada');
        await loadListings(false);
      } else {
        const err = await res.json();
        message.error(err.error ?? 'Error al guardar');
      }
    } catch { /* validation */ } finally {
      setConfigLoading(false);
    }
  };

  const handleRefreshLiveStatus = async () => {
    if (!status?.connected) {
      message.warning('Conecta MeLi primero');
      return;
    }
    setRefreshingStatus(true);
    try {
      await loadListings(true);
      message.success('Estados actualizados desde Mercado Libre');
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleSyncProduct = useCallback(
    async (productId: string) => {
      setSyncingRow(productId);
      try {
        const res = await fetch(`/api/meli/sync/${productId}`, { method: 'POST' });
        const body = await res.json();
        if (res.ok) {
          const actionLabel =
            body.action === 'published'
              ? 'publicado'
              : body.action === 'republished'
                ? 'republicado'
                : 'actualizado';
          message.success(`Producto ${actionLabel} en MeLi`);
          await loadListings(status?.connected ?? false);
        } else {
          message.error(body.error ?? 'Error al sincronizar');
        }
      } finally {
        setSyncingRow(null);
      }
    },
    [loadListings, status],
  );

  const runBulkSync = async (onlyPending: boolean) => {
    if (onlyPending) setSyncingPending(true);
    else setSyncingAll(true);
    try {
      const res = await fetch('/api/meli/sync/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyPending }),
      });
      const body: { synced: number; errors: { productId: string; error: string }[] } = await res.json();
      if (res.ok) {
        message.success(
          onlyPending
            ? `Pendientes sincronizados: ${body.synced}`
            : `Sincronizados: ${body.synced} producto(s)`,
        );
        if (body.errors.length > 0) {
          message.warning(`${body.errors.length} error(es). Revisa la consola.`);
          console.warn('[MeLi bulk sync errors]', body.errors);
        }
        await loadListings(status?.connected ?? false);
      } else {
        message.error('Error en la sincronización masiva');
      }
    } finally {
      setSyncingAll(false);
      setSyncingPending(false);
    }
  };

  const filteredListings = useMemo(() => {
    let filtered = listings;
    if (syncFilter === 'synced') {
      filtered = filtered.filter((row) => Boolean(row.meliItemId) && row.syncState === 'synced');
    } else if (syncFilter !== 'all') {
      filtered = filtered.filter((row) => row.syncState === syncFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.productName.toLowerCase().includes(term) ||
          row?.meliItemId?.toLowerCase().includes(term),
      );
    }
    return filtered;
  }, [listings, syncFilter, searchTerm]);

  const outOfSyncCount =
    summary?.outOfSync ?? listings.filter((r) => r.syncState === 'out_of_sync').length;

  const columns: ColumnsType<ListingRow> = useMemo(
    () => [
      {
        title: 'Producto',
        dataIndex: 'productName',
        key: 'productName',
        width: 240,
        ellipsis: true,
        render: (name: string, row) => (
          <Tooltip title={name} placement="topLeft">
            <div className="flex flex-col">
              <Text
                strong
                className="hover:text-blue-600 transition-colors"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '220px',
                  display: 'block',
                }}
              >
                {name}
              </Text>
              <div
                className="text-xs text-slate-500 mt-0.5"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '220px',
                }}
              >
                Stock: {row.stock}
                {row.meliItemId && (
                  <>
                    {' · '}
                    <a
                      href={
                        row.live?.permalink ??
                        `https://articulo.mercadolibre.com.co/${row.meliItemId?.replace(/^([A-Z]{3})(\d+)/, '$1-$2')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'inline-block',
                        maxWidth: '140px',
                      }}
                    >
                      Ver en MeLi
                    </a>
                  </>
                )}
              </div>
            </div>
          </Tooltip>
        ),
      },
      {
        title: 'Categoría MeLi',
        key: 'meliCategory',
        width: 190,
        render: (_: unknown, row) => {
          if (!row.meliItemId) return <Text type="secondary">—</Text>;
          if (!row.meliCategoryName) {
            return (
              <Tooltip title="Pulsa «Actualizar estados» para consultar la categoría en MeLi">
                <Text type="secondary" className="text-xs">
                  Sin datos
                </Text>
              </Tooltip>
            );
          }
          return (
            <Tooltip title={row.meliCategoryPath ?? row.meliCategoryName}>
              <Text
                className="text-xs"
                style={{
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '170px',
                }}
              >
                {row.meliCategoryName}
              </Text>
            </Tooltip>
          );
        },
      },
      {
        title: 'Precio base',
        dataIndex: 'basePrice',
        key: 'basePrice',
        render: (v: number) => formatCurrency(v),
        align: 'right',
        width: 100,
      },
      {
        title: 'Precio MeLi',
        dataIndex: 'meliPrice',
        key: 'meliPrice',
        render: (v: number, row) => {
          if (row.live?.livePrice != null) {
            return (
              <Tooltip title="Precio en vivo en MeLi">
                <Text strong>{formatCurrency(row.live.livePrice)}</Text>
              </Tooltip>
            );
          }
          if (!row.meliItemId || !v) {
            if (config) {
              const [preview] = previewPrices(
                [{ productPrice: row.basePrice, listingType: config.defaultListingType }],
                config.extraMarginPercent,
                config.fixedCostCOP,
                config.defaultListingType,
              );
              return (
                <Tooltip title="Precio estimado (no publicado)">
                  <Text type="secondary">{formatCurrency(preview.meliPrice)}</Text>
                </Tooltip>
              );
            }
            return '—';
          }
          return <Text strong>{formatCurrency(v)}</Text>;
        },
        align: 'right',
        width: 110,
      },
      {
        title: 'Margen Est.',
        key: 'profit',
        align: 'right',
        width: 130,
        render: (_: unknown, row) => {
          if (!config) return <Text type="secondary">—</Text>;
          let price = row.live?.livePrice || row.meliPrice;
          if (!price) {
            price = previewPrices(
              [{ productPrice: row.basePrice, listingType: config.defaultListingType }],
              config.extraMarginPercent,
              config.fixedCostCOP,
              config.defaultListingType,
            )[0].meliPrice;
          }

          const comissionRate = MELI_COMMISSION_RATES[config.defaultListingType as keyof typeof MELI_COMMISSION_RATES] || 0;
          const comission = Math.round(price * (comissionRate / 100));
          const net = price - comission - config.fixedCostCOP;
          const profit = net - row.basePrice;

          return (
            <Tooltip
              title={
                <div className="text-xs min-w-[150px]">
                  <div className="flex justify-between"><span>Venta:</span> <span>{formatCurrency(price)}</span></div>
                  <div className="flex justify-between text-red-300"><span>Comisión ({comissionRate}%):</span> <span>-{formatCurrency(comission)}</span></div>
                  <div className="flex justify-between text-red-300"><span>Costo fijo:</span> <span>-{formatCurrency(config.fixedCostCOP)}</span></div>
                  <Divider style={{ margin: '4px 0', borderColor: '#475569' }} />
                  <div className="flex justify-between text-blue-300"><span>Liquidación:</span> <span>{formatCurrency(net)}</span></div>
                  <div className="flex justify-between text-slate-300"><span>Costo Base:</span> <span>-{formatCurrency(row.basePrice)}</span></div>
                  <Divider style={{ margin: '4px 0', borderColor: '#475569' }} />
                  <div className="flex justify-between text-green-300 font-bold"><span>Ganancia:</span> <span>{formatCurrency(profit)}</span></div>
                </div>
              }
            >
              <Tag className={profit >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} style={{ margin: 0 }}>
                {formatCurrency(profit)}
              </Tag>
            </Tooltip>
          );
        }
      },
      {
        title: 'Sync',
        key: 'syncState',
        width: 115,
        render: (_: unknown, row) => {
          if (!row.meliExport && !row.meliItemId) {
            return <Tag>No exportado</Tag>;
          }
          if (row.syncState === 'pending') {
            return <Tag color="orange">Pendiente</Tag>;
          }
          if (row.syncState === 'out_of_sync') {
            return (
              <Tooltip title={row.resyncReasons.join(' · ')}>
                <Tag color="volcano">Re-sincronizar</Tag>
              </Tooltip>
            );
          }
          if (row.syncState === 'issues') {
            return <Tag color="red">Revisar</Tag>;
          }
          return <Tag color="green">Sincronizado</Tag>;
        },
      },
      {
        title: 'Visitas (30d)',
        key: 'visits',
        width: 100,
        align: 'center',
        render: (_: unknown, row) => {
          if (!row.meliItemId) return <Text type="secondary">—</Text>;
          if (row.meliVisitsTotal == null) {
            return (
              <Tooltip title="Pulsa «Actualizar estados» para cargar visitas desde MeLi">
                <Text type="secondary" className="text-xs">
                  Sin datos
                </Text>
              </Tooltip>
            );
          }
          return (
            <Tooltip
              title={
                row.meliVisitsCheckedAt
                  ? `Consultado: ${new Date(row.meliVisitsCheckedAt).toLocaleString('es-CO')}`
                  : 'Últimos 30 días'
              }
            >
              <Text strong>{row.meliVisitsTotal.toLocaleString('es-CO')}</Text>
            </Tooltip>
          );
        },
      },
      {
        title: 'Estado en MeLi',
        key: 'liveStatus',
        width: 175,
        render: (_: unknown, row) => {
          if (!row.meliItemId) {
            return row.meliExport ? (
              <Tag color="orange">Por publicar</Tag>
            ) : (
              <Tag>—</Tag>
            );
          }

          if (!row.live) {
            const colorMap: Record<string, string> = {
              ACTIVE: 'green',
              PAUSED: 'gold',
              CLOSED: 'default',
              UNDER_REVIEW: 'blue',
              ERROR: 'red',
            };
            return (
              <Tooltip title="Pulsa «Actualizar estados» para consultar MeLi en vivo">
                <Tag color={colorMap[row.localStatus ?? ''] ?? 'default'}>
                  {row.localStatus ?? 'Local'} (sin consultar)
                </Tag>
              </Tooltip>
            );
          }

          const tagColor =
            row.live.health === 'ok'
              ? 'green'
              : row.live.health === 'warning'
                ? 'gold'
                : row.live.health === 'error'
                  ? 'red'
                  : 'default';

          const detail = row.live.pauseReason ?? row.live.statusDetail;

          return (
            <div className="flex items-start gap-1.5">
              {healthIcon(row.live.health)}
              <div>
                <Tag color={tagColor}>{row.live.statusLabel}</Tag>
                {row.resyncReasons.length > 0 && (
                  <div className="text-xs text-volcano mt-1 max-w-[220px] leading-snug">
                    {row.resyncReasons[0]}
                  </div>
                )}
                {detail && (
                  <div className="text-xs text-slate-500 mt-1 max-w-[200px] leading-snug">
                    {detail}
                  </div>
                )}
                {row.live.availableQuantity != null &&
                  row.live.availableQuantity === 0 && (
                    <div className="text-xs text-amber-600 mt-0.5">
                      0 unidades en MeLi
                    </div>
                  )}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Última sync',
        dataIndex: 'lastSyncAt',
        key: 'lastSyncAt',
        width: 130,
        render: (v?: string) => {
          if (!v) return '—';
          const d = new Date(v);
          return (
            <Tooltip title={d.toLocaleString('es-CO')}>
              <span className="text-xs">{d.toLocaleDateString('es-CO')}</span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Acciones',
        key: 'actions',
        width: 110,
        render: (_: unknown, row) => (
          <Button
            size="small"
            icon={<SyncOutlined spin={syncingRow === row.productId} />}
            onClick={(e) => {
              e.stopPropagation();
              handleSyncProduct(row.productId);
            }}
            disabled={!!syncingRow || syncingAll || syncingPending}
          >
            {row.meliItemId ? 'Actualizar' : 'Publicar'}
          </Button>
        ),
      },
    ],
    [config, syncingRow, syncingAll, syncingPending, handleSyncProduct],
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStatus(), loadConfig(), loadOrders()])
      .then(() => loadListings(false))
      .finally(() => setLoading(false));

    const interval = setInterval(loadStatus, 60_000);
    
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PRODUCT_SAVED') {
        setEditProductModalOpen(false);
        setEditProductId(null);
        loadListings(false);
      } else if (e.data?.type === 'PRODUCT_CANCELLED') {
        setEditProductModalOpen(false);
        setEditProductId(null);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, [loadStatus, loadConfig, loadListings, loadOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large">
          <div className="mt-3 text-gray-500 text-sm">
            Cargando integración MeLi...
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <ConfigProvider locale={esES}>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <Title level={2} className="!mb-0">
          Integración Mercado Libre
        </Title>
        <Paragraph type="secondary">
          Conexión OAuth, precios, estado en vivo de cada publicación (activa, pausada y motivo)
          y sincronización del catálogo con MeLi Colombia (MCO).
        </Paragraph>

         {/* ── Tab Navigation ── */}
        <MeliTabBar
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* ── Tab Content (only active tab renders) ── */}
        {activeTab === 'products' && (
          <MeliProductsTab
            status={status}
            handleRefreshLiveStatus={handleRefreshLiveStatus}
            refreshingStatus={refreshingStatus}
            summary={summary}
            outOfSyncCount={outOfSyncCount}
            filteredListings={filteredListings}
            syncFilter={syncFilter}
            setSyncFilter={setSyncFilter}
            setSearchTerm={setSearchTerm}
            columns={columns}
            syncingAll={syncingAll}
            syncingPending={syncingPending}
            runBulkSync={runBulkSync}
            onListingClick={(productId) => {
              setEditProductId(productId);
              setEditProductModalOpen(true);
            }}
          />
        )}

        {activeTab === 'sales' && (
          <MeliSalesTab
            status={status}
            orders={orders}
            ordersLoading={ordersLoading}
            orderDateRange={orderDateRange}
            setOrderDateRange={setOrderDateRange}
            syncingOrders={syncingOrders}
            handleSyncOrdersFromMeli={handleSyncOrdersFromMeli}
          />
        )}

        {activeTab === 'net' && (
          <MeliNetReportTab
            status={status}
            orders={orders}
            config={config}
            loading={ordersLoading}
          />
        )}

        {activeTab === 'config' && (
          <MeliConfigTab
            status={status}
            config={config}
            form={form}
            configLoading={configLoading}
            handleConnect={handleConnect}
            handleDisconnect={handleDisconnect}
            handleSaveConfig={handleSaveConfig}
            loadStatus={loadStatus}
          />
        )}

        <Divider />
        <Paragraph type="secondary" className="text-xs">
          Variables: <code>MELI_APP_ID</code>, <code>MELI_SECRET_KEY</code>,{' '}
          <code>MELI_REDIRECT_URI</code>
        </Paragraph>
      </div>
      <Modal
        title={
          <div className="flex items-center gap-3 py-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <EditOutlined className="text-blue-600 text-lg" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">Editar Producto</div>
              <div className="text-xs text-slate-500 font-normal">Actualiza el inventario, precio y detalles técnicos</div>
            </div>
          </div>
        }
        open={editProductModalOpen}
        onCancel={() => {
          setEditProductModalOpen(false);
          setEditProductId(null);
          setIframeLoaded(false);
        }}
        footer={null}
        width="min(950px, 95vw)"
        styles={{ 
          body: { padding: 0, height: '78vh', position: 'relative', background: '#f8fafc' },
          header: { padding: '16px 24px', borderBottom: '1px solid #e2e8f0', margin: 0 }
        }}
        closeIcon={<CloseCircleOutlined className="text-xl text-slate-400 hover:text-red-500 transition-colors" />}
        destroyOnClose
      >
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
            <Spin size="large" />
            <div className="mt-4 text-slate-500 font-medium">Cargando editor de producto...</div>
          </div>
        )}
        {editProductId && (
          <iframe
            src={`/admin/products?edit=${editProductId}&iframe=true`}
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none', 
              opacity: iframeLoaded ? 1 : 0, 
              transition: 'opacity 0.4s ease-in-out' 
            }}
            title={`Editar ${editProductId}`}
            onLoad={() => setIframeLoaded(true)}
          />
        )}
      </Modal>
    </ConfigProvider>
  );
}

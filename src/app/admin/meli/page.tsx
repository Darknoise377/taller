'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Button, Card, Col, Divider, Form, InputNumber, message,
  Popconfirm, Row, Select, Segmented, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined,
  DisconnectOutlined, ExclamationCircleOutlined, ReloadOutlined,
  SyncOutlined, WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency } from '@/utils/formatCurrency';
import { previewPrices, MELI_COMMISSION_RATES } from '@/lib/meli/pricing';
import type { MeliSyncFilter } from '@/lib/meli/listingStatus';

const { Title, Text, Paragraph } = Typography;

interface MeliStatus {
  connected: boolean;
  nickname?: string;
  email?: string;
  expiresAt?: string;
}

interface MeliConfig {
  id: number;
  extraMarginPercent: number;
  fixedCostCOP: number;
  defaultListingType: string;
  freeInstallments: number;
  categoryMap: Record<string, string>;
}

interface ListingRow {
  productId: string;
  productName: string;
  basePrice: number;
  meliPrice: number;
  meliItemId?: string;
  localStatus?: string;
  lastSyncAt?: string;
  meliExport: boolean;
  stock: number;
  syncState: 'synced' | 'pending' | 'issues' | 'out_of_sync';
  resyncReasons: string[];
  meliVisitsTotal?: number | null;
  meliVisitsCheckedAt?: string | null;
  live?: {
    statusLabel: string;
    statusDetail: string | null;
    pauseReason: string | null;
    isPaused: boolean;
    isActive: boolean;
    health: 'ok' | 'warning' | 'error' | 'unknown';
    permalink: string | null;
    availableQuantity: number | null;
    livePrice: number | null;
    liveStatus: string;
  } | null;
}

interface ListingsSummary {
  total: number;
  synced: number;
  pending: number;
  issues: number;
  outOfSync: number;
}

const FILTER_OPTIONS: { value: MeliSyncFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'synced', label: 'Sincronizados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'out_of_sync', label: 'Cambios sin sync' },
  { value: 'issues', label: 'Con alertas' },
];

function healthIcon(health?: string) {
  if (health === 'ok') return <CheckCircleOutlined className="text-green-600" />;
  if (health === 'warning') return <WarningOutlined className="text-amber-500" />;
  if (health === 'error') return <CloseCircleOutlined className="text-red-500" />;
  return <ExclamationCircleOutlined className="text-slate-400" />;
}

export default function AdminMeliPage() {
  const [status, setStatus] = useState<MeliStatus | null>(null);
  const [config, setConfig] = useState<MeliConfig | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [summary, setSummary] = useState<ListingsSummary | null>(null);
  const [syncFilter, setSyncFilter] = useState<MeliSyncFilter>('all');
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingPending, setSyncingPending] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [syncingRow, setSyncingRow] = useState<string | null>(null);

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

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStatus(), loadConfig()])
      .then(() => loadListings(false))
      .finally(() => setLoading(false));

    const interval = setInterval(loadStatus, 60_000);
    return () => clearInterval(interval);
  }, [loadStatus, loadConfig, loadListings]);

  const filteredListings = useMemo(() => {
    if (syncFilter === 'all') return listings;
    if (syncFilter === 'synced') {
      return listings.filter((row) => Boolean(row.meliItemId) && row.syncState === 'synced');
    }
    return listings.filter((row) => row.syncState === syncFilter);
  }, [listings, syncFilter]);

  const outOfSyncCount = summary?.outOfSync ?? listings.filter((r) => r.syncState === 'out_of_sync').length;

  const handleConnect = () => { window.location.href = '/api/meli/auth'; };

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

  const handleSyncProduct = async (productId: string) => {
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
  };

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

  const columns: ColumnsType<ListingRow> = [
    {
      title: 'Producto',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
      render: (name: string, row) => (
        <div>
          <Text strong>{name}</Text>
          <div className="text-xs text-slate-500 mt-0.5">
            Stock local: {row.stock}
            {row.meliItemId && (
              <>
                {' · '}
                <a href={row.live?.permalink ?? `https://articulo.mercadolibre.com.co/${row.meliItemId}`} target="_blank" rel="noopener noreferrer">
                  Ver en MeLi
                </a>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Precio base',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (v: number) => formatCurrency(v),
      align: 'right',
      width: 110,
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
      width: 120,
    },
    {
      title: 'Sincronización',
      key: 'syncState',
      width: 130,
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
      title: 'Visitas MeLi (30d)',
      key: 'visits',
      width: 120,
      align: 'center',
      render: (_: unknown, row) => {
        if (!row.meliItemId) return <Text type="secondary">—</Text>;
        if (row.meliVisitsTotal == null) {
          return (
            <Tooltip title="Pulsa «Actualizar estados» para cargar visitas desde MeLi">
              <Text type="secondary" className="text-xs">Sin datos</Text>
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
      width: 200,
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
              {row.live.availableQuantity != null && row.live.availableQuantity === 0 && (
                <div className="text-xs text-amber-600 mt-0.5">0 unidades en MeLi</div>
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
      width: 150,
      render: (v?: string) => (v ? new Date(v).toLocaleString('es-CO') : '—'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_: unknown, row) => (
        <Button
          size="small"
          icon={<SyncOutlined spin={syncingRow === row.productId} />}
          onClick={() => handleSyncProduct(row.productId)}
          disabled={!!syncingRow || syncingAll || syncingPending}
        >
          {row.meliItemId ? 'Actualizar' : 'Publicar'}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large">
          <div className="mt-3 text-gray-500 text-sm">Cargando integración MeLi...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <Title level={2} className="!mb-0">Integración Mercado Libre</Title>
      <Paragraph type="secondary">
        Conexión OAuth, precios, estado en vivo de cada publicación (activa, pausada y motivo)
        y sincronización del catálogo con MeLi Colombia (MCO).
      </Paragraph>

      <Card
        title={
          <span className="flex items-center gap-2">
            <ApiOutlined />
            Conexión con Mercado Libre
          </span>
        }
      >
        {status?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleOutlined />
              <Text strong>Conectado</Text>
            </div>
            <div>
              {status.nickname && <Text>Cuenta: <strong>{status.nickname}</strong></Text>}
              {status.expiresAt && (
                <Text type="secondary" className="ml-3 text-xs">
                  Token expira: {new Date(status.expiresAt).toLocaleString('es-CO')}
                </Text>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <Button icon={<ReloadOutlined />} onClick={loadStatus}>Verificar</Button>
              <Popconfirm
                title="¿Desconectar cuenta de MeLi?"
                description="Se eliminarán los tokens guardados."
                onConfirm={handleDisconnect}
                okText="Sí, desconectar"
                cancelText="Cancelar"
              >
                <Button danger icon={<DisconnectOutlined />}>Desconectar</Button>
              </Popconfirm>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <CloseCircleOutlined />
              <Text type="danger">No conectado</Text>
            </div>
            <Text type="secondary">Conecta tu cuenta para sincronizar productos con MeLi Colombia.</Text>
            <Button type="primary" className="ml-auto" icon={<ApiOutlined />} onClick={handleConnect}>
              Conectar con Mercado Libre
            </Button>
          </div>
        )}
      </Card>

      <Card title="Configuración de precios y publicación">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            extraMarginPercent: 0,
            fixedCostCOP: 3500,
            defaultListingType: 'gold_special',
            freeInstallments: 3,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item name="defaultListingType" label="Tipo de publicación">
                <Select>
                  <Select.Option value="gold_special">
                    Clásica — {MELI_COMMISSION_RATES['gold_special']}%
                  </Select.Option>
                  <Select.Option value="gold_premium">
                    Premium — {MELI_COMMISSION_RATES['gold_premium']}%
                  </Select.Option>
                  <Select.Option value="free">
                    Gratuita — {MELI_COMMISSION_RATES['free']}%
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="freeInstallments" label="Cuotas sin interés" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value={3}>3 cuotas</Select.Option>
                  <Select.Option value={6}>6 cuotas (Cuotas Extra)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="extraMarginPercent" label="Margen adicional (%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={79} step={0.5} suffix="%" className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="fixedCostCOP" label="Costo fijo (COP)" rules={[{ required: true }]}>
                <InputNumber min={0} step={500} prefix="$" className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" loading={configLoading} onClick={handleSaveConfig}>
            Guardar configuración
          </Button>
        </Form>
      </Card>

      <Card
        title="Catálogo de productos"
        extra={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              icon={<ReloadOutlined spin={refreshingStatus} />}
              loading={refreshingStatus}
              disabled={!status?.connected}
              onClick={handleRefreshLiveStatus}
            >
              Actualizar estados
            </Button>
            <Button
              icon={<SyncOutlined spin={syncingPending} />}
              loading={syncingPending}
              disabled={!status?.connected || syncingAll}
              onClick={() => runBulkSync(true)}
            >
              Sync pendientes
            </Button>
            <Button
              type="primary"
              icon={<SyncOutlined spin={syncingAll} />}
              loading={syncingAll}
              disabled={!status?.connected || syncingPending}
              onClick={() => runBulkSync(false)}
            >
              Sincronizar todos
            </Button>
          </div>
        }
      >
        {!status?.connected && (
          <Paragraph type="warning" className="!mb-3">
            Conecta tu cuenta de MeLi para publicar y consultar estados en vivo.
          </Paragraph>
        )}

        {summary && (
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <Tag>{summary.total} productos</Tag>
            <Tag color="green">{summary.synced} sincronizados</Tag>
            <Tag color="orange">{summary.pending} pendientes</Tag>
            <Tag color="volcano">{summary.outOfSync} con cambios locales</Tag>
            <Tag color="red">{summary.issues} con alertas</Tag>
          </div>
        )}

        {outOfSyncCount > 0 && (
          <Paragraph type="warning" className="!mb-3 text-sm">
            Hay {outOfSyncCount} producto(s) con cambios en la tienda que aún no se reflejan en MeLi.
            Usa <strong>Actualizar</strong> en cada fila o <strong>Sync pendientes</strong> / <strong>Sincronizar todos</strong>.
          </Paragraph>
        )}

        <Segmented
          className="!mb-4"
          value={syncFilter}
          onChange={(v) => setSyncFilter(v as MeliSyncFilter)}
          options={FILTER_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />

        <Table
          dataSource={filteredListings}
          columns={columns}
          rowKey="productId"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} filas` }}
          scroll={{ x: 960 }}
        />
      </Card>

      <Divider />
      <Paragraph type="secondary" className="text-xs">
        Variables: <code>MELI_APP_ID</code>, <code>MELI_SECRET_KEY</code>,{' '}
        <code>MELI_REDIRECT_URI</code>
      </Paragraph>
    </div>
  );
}

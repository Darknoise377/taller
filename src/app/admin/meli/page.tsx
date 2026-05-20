'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Button, Card, Col, Divider, Form, InputNumber, message,
  Popconfirm, Row, Select, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined,
  DisconnectOutlined, ReloadOutlined, SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency } from '@/utils/formatCurrency';
import { previewPrices, MELI_COMMISSION_RATES } from '@/lib/meli/pricing';

const { Title, Text, Paragraph } = Typography;

// ─── Types ───────────────────────────────────────────────────────────────────

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
  status?: string;
  lastSyncAt?: string;
  meliExport: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminMeliPage() {
  const [status, setStatus] = useState<MeliStatus | null>(null);
  const [config, setConfig] = useState<MeliConfig | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingRow, setSyncingRow] = useState<string | null>(null);

  const [form] = Form.useForm<Omit<MeliConfig, 'id' | 'categoryMap'>>();

  // ─── Load data ─────────────────────────────────────────────────────────────
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

  const loadListings = useCallback(async () => {
    try {
      const res = await fetch('/api/products?all=true&limit=500');
      if (!res.ok) return;
      const data: {
        items: {
          id: string; name: string; price: number; meliExport: boolean;
          meliListing?: { meliItemId: string; status: string; meliPrice: number; lastSyncAt: string };
        }[];
      } = await res.json();
      const products = data.items ?? [];

      const rows: ListingRow[] = products.map((p) => ({
        productId: p.id,
        productName: p.name,
        basePrice: p.price,
        meliPrice: p.meliListing?.meliPrice ?? 0,
        meliItemId: p.meliListing?.meliItemId,
        status: p.meliListing?.status,
        lastSyncAt: p.meliListing?.lastSyncAt,
        meliExport: p.meliExport,
      }));

      setListings(rows);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStatus(), loadConfig(), loadListings()]).finally(() =>
      setLoading(false),
    );
  }, [loadStatus, loadConfig, loadListings]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

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
        await loadListings(); // re-compute prices
      } else {
        const err = await res.json();
        message.error(err.error ?? 'Error al guardar');
      }
    } catch { /* validation failed */ } finally {
      setConfigLoading(false);
    }
  };

  const handleSyncProduct = async (productId: string) => {
    setSyncingRow(productId);
    try {
      const res = await fetch(`/api/meli/sync/${productId}`, { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        const actionLabel = body.action === 'published' ? 'publicado' : body.action === 'republished' ? 'republicado (ítem anterior estaba cerrado)' : 'actualizado';
        message.success(`Producto ${actionLabel} en MeLi`);
        await loadListings();
      } else {
        message.error(body.error ?? 'Error al sincronizar');
      }
    } finally {
      setSyncingRow(null);
    }
  };

  const handleBulkSync = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch('/api/meli/sync/bulk', { method: 'POST' });
      const body: { synced: number; errors: { productId: string; error: string }[] } = await res.json();
      if (res.ok) {
        message.success(`Sincronizados: ${body.synced} producto(s)`);
        if (body.errors.length > 0) {
          message.warning(`${body.errors.length} error(es). Revisa la consola.`);
          console.warn('[MeLi bulk sync errors]', body.errors);
        }
        await loadListings();
      } else {
        message.error('Error en la sincronización masiva');
      }
    } finally {
      setSyncingAll(false);
    }
  };

  // ─── Columns ───────────────────────────────────────────────────────────────

  const columns: ColumnsType<ListingRow> = [
    {
      title: 'Producto',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
    },
    {
      title: 'Precio base',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (v: number) => formatCurrency(v),
      align: 'right',
    },
    {
      title: 'Precio MeLi',
      dataIndex: 'meliPrice',
      key: 'meliPrice',
      render: (v: number, row) => {
        if (!row.meliItemId || !v) {
          // Preview with current config
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
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_: unknown, row) => {
        if (!row.meliItemId) {
          return row.meliExport
            ? <Tag color="orange">Por publicar</Tag>
            : <Tag>No exportado</Tag>;
        }
        const colorMap: Record<string, string> = {
          ACTIVE: 'green', PAUSED: 'gold', CLOSED: 'default',
          UNDER_REVIEW: 'blue', ERROR: 'red',
        };
        return <Tag color={colorMap[row.status ?? ''] ?? 'default'}>{row.status}</Tag>;
      },
    },
    {
      title: 'Última sync',
      dataIndex: 'lastSyncAt',
      key: 'lastSyncAt',
      render: (v?: string) => v ? new Date(v).toLocaleString('es-CO') : '—',
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, row) => (
        <Button
          size="small"
          icon={<SyncOutlined spin={syncingRow === row.productId} />}
          onClick={() => handleSyncProduct(row.productId)}
          disabled={!!syncingRow || syncingAll}
        >
          {row.meliItemId ? 'Actualizar' : 'Publicar'}
        </Button>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <Title level={2} className="!mb-0">Integración Mercado Libre</Title>
      <Paragraph type="secondary">
        Administra la conexión OAuth, la configuración de precios y la sincronización
        del catálogo con Mercado Libre Colombia (MCO).
      </Paragraph>

      {/* ── Connection card ─────────────────────────────────────────── */}
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
            <Button
              type="primary"
              className="ml-auto"
              icon={<ApiOutlined />}
              onClick={handleConnect}
            >
              Conectar con Mercado Libre
            </Button>
          </div>
        )}
      </Card>

      {/* ── Config card ─────────────────────────────────────────────── */}
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
              <Form.Item
                name="defaultListingType"
                label="Tipo de publicación"
                tooltip="Selecciona el tipo de publicación. La comisión de MeLi se calcula automáticamente."
              >
                <Select>
                  <Select.Option value="gold_special">
                    Clásica — MeLi cobra {MELI_COMMISSION_RATES['gold_special']}%
                  </Select.Option>
                  <Select.Option value="gold_premium">
                    Premium — MeLi cobra {MELI_COMMISSION_RATES['gold_premium']}%
                  </Select.Option>
                  <Select.Option value="free">
                    Gratuita — MeLi cobra {MELI_COMMISSION_RATES['free']}%
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="freeInstallments"
                label="Cuotas sin interés"
                tooltip="Cargo por venta y cuotas. 6 cuotas aplica tarifa adicional de MeLi (Cuotas Extra)."
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Select>
                  <Select.Option value={3}>3 cuotas — sin costo extra</Select.Option>
                  <Select.Option value={6}>6 cuotas — Cuotas Extra MeLi</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="extraMarginPercent"
                label="Margen adicional (%)"
                tooltip="Porcentaje extra que se suma sobre la comisión de MeLi. Déjalo en 0 si solo quieres recuperar lo que cobra MeLi."
                rules={[
                  { required: true, message: 'Requerido' },
                  { type: 'number', min: 0, max: 79, message: '0–79' },
                ]}
              >
                <InputNumber min={0} max={79} step={0.5} suffix="%" className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="fixedCostCOP"
                label="Costo fijo por venta (COP)"
                tooltip="Costo fijo por envío, empaque, etc."
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <InputNumber min={0} step={500} prefix="$" className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Button
            type="primary"
            loading={configLoading}
            onClick={handleSaveConfig}
          >
            Guardar configuración
          </Button>
        </Form>
      </Card>

      {/* ── Listings table ──────────────────────────────────────────── */}
      <Card
        title="Catálogo de productos"
        extra={
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncingAll} />}
            loading={syncingAll}
            disabled={!status?.connected}
            onClick={handleBulkSync}
          >
            Sincronizar todos
          </Button>
        }
      >
        {!status?.connected && (
          <Paragraph type="warning" className="!mb-3">
            Conecta tu cuenta de MeLi para poder publicar o actualizar productos.
          </Paragraph>
        )}
        <Table
          dataSource={listings}
          columns={columns}
          rowKey="productId"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true }}
          scroll={{ x: 700 }}
        />
      </Card>

      <Divider />
      <Paragraph type="secondary" className="text-xs">
        Variables de entorno requeridas:{' '}
        <code>MELI_APP_ID</code>, <code>MELI_SECRET_KEY</code>,{' '}
        <code>MELI_REDIRECT_URI</code> (= <code>https://[dominio]/api/meli/callback</code>)
      </Paragraph>
    </div>
  );
}

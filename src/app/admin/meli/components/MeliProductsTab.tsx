'use client';

import React from 'react';
import {
  Button,
  Card,
  Form,
  InputNumber,
  Popconfirm,
  Row,
  Col,
  Select,
  Table,
  Tag,
  Typography,
  Input,
  Segmented,
} from 'antd';
import type { FormInstance } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { MELI_COMMISSION_RATES } from '@/lib/meli/pricing';
import type { MeliSyncFilter } from '@/lib/meli/listingStatus';
import type {
  MeliStatus,
  MeliConfig,
  ListingRow,
  ListingsSummary,
} from '../types';

const { Text, Paragraph } = Typography;

const FILTER_OPTIONS: { value: MeliSyncFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'synced', label: 'Sincronizados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'out_of_sync', label: 'Cambios sin sync' },
  { value: 'issues', label: 'Con alertas' },
];

interface MeliProductsTabProps {
  status: MeliStatus | null;
  config: MeliConfig | null;
  form: FormInstance;
  configLoading: boolean;
  handleConnect: () => void;
  handleDisconnect: () => void;
  handleSaveConfig: () => Promise<void>;
  handleRefreshLiveStatus: () => Promise<void>;
  refreshingStatus: boolean;
  loadStatus: () => Promise<void>;
  summary: ListingsSummary | null;
  outOfSyncCount: number;
  filteredListings: ListingRow[];
  syncFilter: MeliSyncFilter;
  setSyncFilter: (value: MeliSyncFilter) => void;
  setSearchTerm: (value: string) => void;
  columns: ColumnsType<ListingRow>;
  syncingAll: boolean;
  syncingPending: boolean;
  runBulkSync: (onlyPending: boolean) => Promise<void>;
  onListingClick: (productId: string) => void;
}

export default function MeliProductsTab({
  status,
  config,
  form,
  configLoading,
  handleConnect,
  handleDisconnect,
  handleSaveConfig,
  handleRefreshLiveStatus,
  refreshingStatus,
  loadStatus,
  summary,
  outOfSyncCount,
  filteredListings,
  syncFilter,
  setSyncFilter,
  setSearchTerm,
  columns,
  syncingAll,
  syncingPending,
  runBulkSync,
  onListingClick,
}: MeliProductsTabProps) {
  return (
    <div className="space-y-6">
      {/* ── Connection Status ── */}
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
              {status.nickname && (
                <Text>
                  Cuenta: <strong>{status.nickname}</strong>
                </Text>
              )}
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
            <Text type="secondary">
              Conecta tu cuenta para sincronizar productos con MeLi Colombia.
            </Text>
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

      {/* ── Configuración de precios y publicación ── */}
      <Card title="Configuración de precios y publicación">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            extraMarginPercent: config?.extraMarginPercent ?? 0,
            fixedCostCOP: config?.fixedCostCOP ?? 3500,
            defaultListingType: config?.defaultListingType ?? 'gold_special',
            freeInstallments: config?.freeInstallments ?? 3,
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

      {/* ── Catálogo de productos ── */}
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
            Hay {outOfSyncCount} producto(s) con cambios en la tienda que aún no se
            reflejan en MeLi. Usa <strong>Actualizar</strong> en cada fila o{' '}
            <strong>Sync pendientes</strong> / <strong>Sincronizar todos</strong>.
          </Paragraph>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center justify-between">
          <Segmented
            value={syncFilter}
            onChange={(v) => setSyncFilter(v as MeliSyncFilter)}
            options={FILTER_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <Input.Search
            placeholder="Buscar producto por nombre o ID MeLi"
            allowClear
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 350 }}
          />
        </div>

        <Table
          dataSource={filteredListings}
          columns={columns}
          rowKey="productId"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} filas` }}
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => onListingClick(record.productId),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}

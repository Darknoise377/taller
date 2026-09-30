'use client';

import React from 'react';
import {
  Button,
  Card,
  Row,
  Col,
  Table,
  Typography,
  Input,
  Segmented,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MeliSyncFilter } from '@/lib/meli/listingStatus';
import type {
  MeliStatus,
  ListingRow,
  ListingsSummary,
} from '../types';

const { Paragraph } = Typography;

const FILTER_OPTIONS: { value: MeliSyncFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'synced', label: 'Sincronizados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'out_of_sync', label: 'Cambios sin sync' },
  { value: 'issues', label: 'Con alertas' },
];

interface MeliProductsTabProps {
  status: MeliStatus | null;
  handleRefreshLiveStatus: () => Promise<void>;
  refreshingStatus: boolean;
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
  handleRefreshLiveStatus,
  refreshingStatus,
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
      {/* ── Estadísticas Premium ── */}
      {summary && (
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="shadow-sm border-slate-200">
              <Typography.Text type="secondary" className="text-xs uppercase font-semibold">Total</Typography.Text>
              <div className="text-2xl font-bold text-slate-800">{summary.total}</div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={5}>
            <Card size="small" className="shadow-sm border-green-200 bg-green-50/30">
              <Typography.Text type="secondary" className="text-xs uppercase font-semibold text-green-700">Sincronizados</Typography.Text>
              <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <CheckCircleOutlined className="text-xl" />
                {summary.synced}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={5}>
            <Card size="small" className="shadow-sm border-orange-200 bg-orange-50/30">
              <Typography.Text type="secondary" className="text-xs uppercase font-semibold text-orange-700">Pendientes</Typography.Text>
              <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                <SyncOutlined className="text-xl" />
                {summary.pending}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={5}>
            <Card size="small" className="shadow-sm border-yellow-300 bg-yellow-50/50">
              <Typography.Text type="secondary" className="text-xs uppercase font-semibold text-yellow-700">Cambios Locales</Typography.Text>
              <div className="text-2xl font-bold text-yellow-600 flex items-center gap-2">
                <ApiOutlined className="text-xl" />
                {summary.outOfSync}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={5}>
            <Card size="small" className="shadow-sm border-red-200 bg-red-50/30">
              <Typography.Text type="secondary" className="text-xs uppercase font-semibold text-red-700">Con Alertas</Typography.Text>
              <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
                <CloseCircleOutlined className="text-xl" />
                {summary.issues}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* ── Catálogo de productos ── */}
      <Card
        className="shadow-sm border-slate-200"
        title={<span className="text-lg">Catálogo Sincronizado</span>}
        extra={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              icon={<ReloadOutlined spin={refreshingStatus} />}
              loading={refreshingStatus}
              disabled={!status?.connected}
              onClick={handleRefreshLiveStatus}
              className="hidden sm:inline-flex"
            >
              Consultar MeLi
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              Sincronizar todos
            </Button>
          </div>
        }
      >
        {!status?.connected && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-2">
            <ApiOutlined />
            <span>Debes configurar y conectar tu cuenta en la pestaña <strong>Configuración de Precios</strong> para sincronizar.</span>
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

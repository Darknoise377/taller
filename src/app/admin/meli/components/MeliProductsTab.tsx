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
  Alert,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
  AimOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MeliSyncFilter } from '@/lib/meli/listingStatus';
import type {
  MeliStatus,
  ListingRow,
  ListingsSummary,
} from '../types';

const { Paragraph, Text } = Typography;

const FILTER_OPTIONS: { value: MeliSyncFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'synced', label: 'Sincronizados' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'out_of_sync', label: 'Cambios sin sync' },
  { value: 'issues', label: 'Con alertas' },
  { value: 'category_issue', label: '⚠️ Sección a corregir' },
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
  onAuditCategory?: (row: ListingRow) => void;
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
  const categoryIssuesCount = summary?.categoryIssues ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Estadísticas Premium ── */}
      {summary && (
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="shadow-sm border-slate-200">
              <Text type="secondary" className="text-xs uppercase font-semibold">Total Catálogo</Text>
              <div className="text-2xl font-bold text-slate-800 mt-1">{summary.total}</div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="shadow-sm border-green-200 bg-green-50/30">
              <Text type="secondary" className="text-xs uppercase font-semibold text-green-700">Sincronizados</Text>
              <div className="text-2xl font-bold text-green-600 flex items-center gap-2 mt-1">
                <CheckCircleOutlined className="text-xl" />
                {summary.synced}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="shadow-sm border-orange-200 bg-orange-50/30">
              <Text type="secondary" className="text-xs uppercase font-semibold text-orange-700">Pendientes</Text>
              <div className="text-2xl font-bold text-orange-600 flex items-center gap-2 mt-1">
                <SyncOutlined className="text-xl" />
                {summary.pending}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="shadow-sm border-yellow-300 bg-yellow-50/50">
              <Text type="secondary" className="text-xs uppercase font-semibold text-yellow-700">Cambios Locales</Text>
              <div className="text-2xl font-bold text-yellow-600 flex items-center gap-2 mt-1">
                <ApiOutlined className="text-xl" />
                {summary.outOfSync}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small" className="shadow-sm border-red-200 bg-red-50/30">
              <Text type="secondary" className="text-xs uppercase font-semibold text-red-700">Con Alertas</Text>
              <div className="text-2xl font-bold text-red-600 flex items-center gap-2 mt-1">
                <CloseCircleOutlined className="text-xl" />
                {summary.issues}
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card
              size="small"
              className={`shadow-sm transition-all cursor-pointer ${
                categoryIssuesCount > 0
                  ? 'border-amber-400 bg-amber-50/60 hover:bg-amber-100/60'
                  : 'border-slate-200'
              }`}
              onClick={() => {
                if (categoryIssuesCount > 0) {
                  setSyncFilter('category_issue');
                }
              }}
            >
              <Text
                type="secondary"
                className={`text-xs uppercase font-semibold ${
                  categoryIssuesCount > 0 ? 'text-amber-800' : ''
                }`}
              >
                Sección a Corregir
              </Text>
              <div
                className={`text-2xl font-bold flex items-center gap-2 mt-1 ${
                  categoryIssuesCount > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <AimOutlined className="text-xl" />
                {categoryIssuesCount}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Category Issue Banner if any */}
      {categoryIssuesCount > 0 && syncFilter !== 'category_issue' && (
        <Alert
          type="warning"
          showIcon
          message={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-amber-900">
                Hay {categoryIssuesCount} producto(s) en secciones de Mercado Libre que requieren corrección
              </span>
              <Button
                size="small"
                type="primary"
                className="bg-amber-600 hover:bg-amber-700 text-xs font-semibold"
                onClick={() => setSyncFilter('category_issue')}
              >
                Ver productos a corregir
              </Button>
            </div>
          }
          description="Algunos repuestos de moto quedaron clasificados en carros, maquinaria o en una categoría ajena. Puedes reasignarlos rápidamente haciendo clic en su etiqueta de categoría."
          className="border-amber-300"
        />
      )}

      {/* ── Catálogo de productos ── */}
      <Card
        className="shadow-sm border-slate-200"
        title={<span className="text-lg font-bold text-slate-800">Catálogo de Productos en MeLi</span>}
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
              className="bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              Sincronizar todos
            </Button>
          </div>
        }
      >
        {!status?.connected && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-2 text-sm">
            <ApiOutlined />
            <span>
              Debes conectar tu cuenta en la pestaña <strong>Configuración MeLi</strong> para sincronizar.
            </span>
          </div>
        )}

        {outOfSyncCount > 0 && (
          <Paragraph type="warning" className="!mb-3 text-sm">
            Hay {outOfSyncCount} producto(s) con cambios en la tienda que aún no se reflejan en MeLi.
          </Paragraph>
        )}

        <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center justify-between">
          <div className="w-full md:w-auto overflow-x-auto pb-1 scrollbar-none">
            <Segmented
              value={syncFilter}
              onChange={(v) => setSyncFilter(v as MeliSyncFilter)}
              options={FILTER_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          </div>
          <Input.Search
            placeholder="Buscar por nombre, ID MeLi o categoría..."
            allowClear
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-xs"
          />
        </div>

        <Table
          dataSource={filteredListings}
          columns={columns}
          rowKey="productId"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} productos` }}
          scroll={{ x: 1050 }}
          onRow={(record) => ({
            onClick: () => onListingClick(record.productId),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </div>
  );
}

'use client';

import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Table,
  Tag,
  Typography,
  Input,
  Segmented,
  Tooltip,
  Row,
  Col,
} from 'antd';
import {
  SyncOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency } from '@/utils/formatCurrency';
import type { MeliOrderRow, MeliStatus } from '../types';
import MeliOrderDetailModal from './MeliOrderDetailModal';

const { Text } = Typography;
const { RangePicker } = DatePicker;

type RawPayload = NonNullable<MeliOrderRow['rawPayload']>;

interface MeliSalesTabProps {
  status: MeliStatus | null;
  orders: MeliOrderRow[];
  ordersLoading: boolean;
  orderDateRange: [string, string] | null;
  setOrderDateRange: (range: [string, string] | null) => void;
  syncingOrders: boolean;
  handleSyncOrdersFromMeli: () => Promise<void>;
}

const formatOrderProducts = (payload: RawPayload | null | undefined): string => {
  if (!payload?.order_items?.length) return 'Sin detalle de producto';

  return payload.order_items
    .map((orderItem) => {
      const title = orderItem?.item?.title?.trim();
      if (!title) return null;
      const quantity = orderItem?.quantity ?? 1;
      return quantity > 1 ? `${title} (x${quantity})` : title;
    })
    .filter(Boolean)
    .join(', ');
};

const formatOrderBuyer = (payload: RawPayload | null | undefined): string => {
  const firstName = payload?.buyer?.first_name?.trim();
  const lastName = payload?.buyer?.last_name?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const nickname = payload?.buyer?.nickname?.trim();

  if (fullName && nickname) return `${fullName} (${nickname})`;
  if (fullName) return fullName;
  if (nickname) return nickname;
  if (payload?.buyer?.email) return payload.buyer.email;
  return 'Comprador MeLi';
};

const formatSaleDate = (order: MeliOrderRow): string => {
  const dateStr = order.rawPayload?.date_created ?? order.createdAt;
  return new Date(dateStr).toLocaleString('es-CO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getOrderSaleDate = (order: MeliOrderRow): Date => {
  return new Date(order.rawPayload?.date_created ?? order.createdAt);
};

const renderOrderStatus = (status: string): React.ReactNode => {
  const normalized = status?.toLowerCase?.() ?? '';
  const statusMap: Record<string, { label: string; color: string }> = {
    paid: { label: 'Pagada', color: 'success' },
    cancelled: { label: 'Cancelada', color: 'error' },
    payment_required: { label: 'Pendiente', color: 'warning' },
    partially_refunded: { label: 'Reembolso', color: 'processing' },
    confirmed: { label: 'Confirmada', color: 'processing' },
  };

  const mapped = statusMap[normalized] ?? {
    label: normalized ? normalized.replace(/_/g, ' ') : 'Sin estado',
    color: 'default',
  };

  return <Tag color={mapped.color} className="uppercase font-semibold text-[11px]">{mapped.label}</Tag>;
};

export default function MeliSalesTab({
  status,
  orders,
  ordersLoading,
  orderDateRange,
  setOrderDateRange,
  syncingOrders,
  handleSyncOrdersFromMeli,
}: MeliSalesTabProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Date range
    if (orderDateRange) {
      const [start, end] = orderDateRange;
      const startDate = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T23:59:59.999`);
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      if (!Number.isNaN(startTime) && !Number.isNaN(endTime)) {
        result = result.filter((order) => {
          const saleTime = getOrderSaleDate(order).getTime();
          return !Number.isNaN(saleTime) && saleTime >= startTime && saleTime <= endTime;
        });
      }
    }

    // Status
    if (statusFilter === 'paid') {
      result = result.filter((o) => o.status.toLowerCase() === 'paid');
    } else if (statusFilter === 'pending') {
      result = result.filter((o) =>
        ['payment_required', 'pending', 'confirmed'].includes(o.status.toLowerCase()),
      );
    } else if (statusFilter === 'cancelled') {
      result = result.filter((o) => o.status.toLowerCase() === 'cancelled');
    }

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((o) => {
        const matchesId = o.meliOrderId.toLowerCase().includes(q);
        const buyerName = formatOrderBuyer(o.rawPayload).toLowerCase();
        const products = formatOrderProducts(o.rawPayload).toLowerCase();
        return matchesId || buyerName.includes(q) || products.includes(q);
      });
    }

    return result;
  }, [orders, orderDateRange, statusFilter, searchTerm]);

  // Overall Financial Metrics from filtered orders
  const metrics = useMemo(() => {
    let totalGross = 0;
    let totalCommission = 0;
    let totalShipping = 0;
    let paidCount = 0;

    for (const order of filteredOrders) {
      if (order.status.toLowerCase() === 'paid') {
        paidCount++;
        totalGross += order.rawPayload?.total_amount || 0;
        totalCommission += order.realCommission || 0;
        totalShipping += order.realShippingCost || 0;
      }
    }

    const netTotal = totalGross - totalCommission - totalShipping;

    return {
      totalGross,
      totalCommission,
      totalShipping,
      netTotal,
      paidCount,
      totalCount: filteredOrders.length,
    };
  }, [filteredOrders]);

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setModalOpen(true);
  };

  const columns: ColumnsType<MeliOrderRow> = useMemo(
    () => [
      {
        title: 'Orden MeLi',
        dataIndex: 'meliOrderId',
        key: 'meliOrderId',
        width: 140,
        render: (id: string) => (
          <div className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1">
            <span>#{id}</span>
          </div>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => renderOrderStatus(status),
      },
      {
        title: 'Comprador',
        dataIndex: 'rawPayload',
        key: 'buyer',
        width: 180,
        ellipsis: true,
        render: (payload: RawPayload | null | undefined) => (
          <div className="truncate">
            <span className="font-medium text-slate-900 block text-xs">{formatOrderBuyer(payload)}</span>
            {payload?.buyer?.email && (
              <span className="text-[11px] text-slate-400 block truncate">{payload.buyer.email}</span>
            )}
          </div>
        ),
      },
      {
        title: 'Destino',
        key: 'destination',
        width: 150,
        ellipsis: true,
        render: (_, order) => {
          const addr = order.rawPayload?.shipping?.receiver_address;
          if (!addr) {
            return <span className="text-slate-400 text-xs">A convenir</span>;
          }
          const city = typeof addr.city === 'object' ? addr.city?.name : addr.city;
          const state = typeof addr.state === 'object' ? addr.state?.name : addr.state;
          return (
            <div className="text-xs">
              <span className="font-medium text-slate-800 block truncate">{city || '—'}</span>
              <span className="text-[11px] text-slate-500 block truncate">{state || ''}</span>
            </div>
          );
        },
      },
      {
        title: 'Monto Venta',
        dataIndex: 'rawPayload',
        key: 'total_amount',
        align: 'right',
        width: 120,
        render: (payload: RawPayload | null | undefined, order) => {
          const gross = payload?.total_amount || 0;
          const comm = order.realCommission || 0;
          const net = gross - comm - (order.realShippingCost || 0);

          return (
            <div className="text-right">
              <div className="font-bold text-slate-900 text-xs">{formatCurrency(gross)}</div>
              {comm > 0 && (
                <div className="text-[10px] text-emerald-600 font-medium">
                  Neto: {formatCurrency(net)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: 'Productos',
        dataIndex: 'rawPayload',
        key: 'products',
        ellipsis: true,
        render: (payload: RawPayload | null | undefined) => (
          <Tooltip title={formatOrderProducts(payload)}>
            <span className="text-xs text-slate-700 block truncate max-w-[280px]">
              {formatOrderProducts(payload)}
            </span>
          </Tooltip>
        ),
      },
      {
        title: 'Fecha',
        key: 'saleDate',
        width: 120,
        render: (_: unknown, order: MeliOrderRow) => (
          <span className="text-xs text-slate-500">{formatSaleDate(order)}</span>
        ),
      },
      {
        title: 'Acción',
        key: 'actions',
        width: 90,
        align: 'center',
        render: (_, order) => (
          <Button
            size="small"
            type="primary"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetail(order.meliOrderId);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-xs"
          >
            Ver
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      {/* KPI Financial Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" className="shadow-sm border-slate-200">
            <Text type="secondary" className="text-xs uppercase font-semibold">Total Vendido MeLi</Text>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(metrics.totalGross)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {metrics.paidCount} orden(es) pagadas
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" className="shadow-sm border-red-200 bg-red-50/20">
            <Text type="secondary" className="text-xs uppercase font-semibold text-red-700">Comisiones MeLi</Text>
            <div className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
              -{formatCurrency(metrics.totalCommission)}
            </div>
            <div className="text-[11px] text-red-500 mt-0.5">Retención de plataforma</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" className="shadow-sm border-amber-200 bg-amber-50/20">
            <Text type="secondary" className="text-xs uppercase font-semibold text-amber-700">Flete Asumido</Text>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
              -{formatCurrency(metrics.totalShipping)}
            </div>
            <div className="text-[11px] text-amber-600 mt-0.5">Envío Gratis asumido</div>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size="small" className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <Text type="secondary" className="text-xs uppercase font-semibold text-emerald-700">Neto Liquidado</Text>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(metrics.netTotal)}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Abonado a Mercado Pago</div>
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card
        className="shadow-sm border-slate-200"
        title={<span className="text-base sm:text-lg font-bold text-slate-800">Órdenes de Mercado Libre</span>}
        extra={
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncingOrders} />}
            loading={syncingOrders}
            disabled={!status?.connected}
            onClick={handleSyncOrdersFromMeli}
            size="small"
            className="bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            Importar Nuevas Órdenes
          </Button>
        }
      >
        {/* Filters bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 justify-between items-start md:items-center">
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <Segmented
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as 'all' | 'paid' | 'pending' | 'cancelled')}
              options={[
                { label: 'Todas', value: 'all' },
                { label: 'Pagadas', value: 'paid' },
                { label: 'Pendientes', value: 'pending' },
                { label: 'Canceladas', value: 'cancelled' },
              ]}
            />
            <RangePicker
              format="YYYY-MM-DD"
              allowClear
              placeholder={['Desde', 'Hasta']}
              className="max-w-[240px]"
              onChange={(_, dateStrings) => {
                const [start, end] = dateStrings;
                if (start && end) {
                  setOrderDateRange([start, end]);
                  return;
                }
                setOrderDateRange(null);
              }}
            />
          </div>

          <Input.Search
            placeholder="Buscar por ID, comprador o producto..."
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-xs"
          />
        </div>

        {/* Responsive Table */}
        <Table
          dataSource={filteredOrders}
          rowKey="meliOrderId"
          loading={ordersLoading}
          size="small"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `${total} órdenes`,
          }}
          scroll={{ x: 800 }}
          onRow={(record) => ({
            onClick: () => handleOpenDetail(record.meliOrderId),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
          locale={{
            emptyText: ordersLoading
              ? 'Consultando órdenes...'
              : orders.length === 0
                ? 'No hay órdenes de Mercado Libre registradas aún'
                : 'No se encontraron órdenes con los filtros actuales',
          }}
          columns={columns}
        />
      </Card>

      {/* Order Detail Modal */}
      <MeliOrderDetailModal
        orderId={selectedOrderId}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrderId(null);
        }}
      />
    </div>
  );
}

export { formatOrderProducts, formatOrderBuyer, formatSaleDate, getOrderSaleDate, renderOrderStatus };

'use client';

import React, { useMemo } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { formatCurrency } from '@/utils/formatCurrency';
import type { MeliOrderRow, MeliStatus } from '../types';

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
  const nickname = payload?.buyer?.nickname?.trim();
  const email = payload?.buyer?.email?.trim();
  if (nickname && email) return `${nickname} (${email})`;
  if (nickname) return nickname;
  if (email) return email;
  return 'Sin datos';
};

const formatSaleDate = (order: MeliOrderRow): string => {
  return new Date(order.rawPayload?.date_created ?? order.createdAt).toLocaleString();
};

const getOrderSaleDate = (order: MeliOrderRow): Date => {
  return new Date(order.rawPayload?.date_created ?? order.createdAt);
};

const renderOrderStatus = (status: string): React.ReactNode => {
  const normalized = status?.toLowerCase?.() ?? '';
  const statusMap: Record<string, { label: string; color: string }> = {
    paid: { label: 'Pagada', color: 'success' },
    cancelled: { label: 'Cancelada', color: 'error' },
    payment_required: { label: 'Pago pendiente', color: 'warning' },
    partially_refunded: { label: 'Reembolso parcial', color: 'processing' },
    confirmed: { label: 'Confirmada', color: 'processing' },
  };

  const mapped = statusMap[normalized] ?? {
    label: normalized ? normalized.replace(/_/g, ' ') : 'Sin estado',
    color: 'default',
  };

  return <Tag color={mapped.color}>{mapped.label.toUpperCase()}</Tag>;
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
  const filteredOrders = useMemo(() => {
    if (!orderDateRange) return orders;

    const [start, end] = orderDateRange;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59.999`);
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) return orders;

    return orders.filter((order) => {
      const saleTime = getOrderSaleDate(order).getTime();
      return !Number.isNaN(saleTime) && saleTime >= startTime && saleTime <= endTime;
    });
  }, [orders, orderDateRange]);

  const columns: ColumnsType<MeliOrderRow> = useMemo(
    () => [
      {
        title: 'Orden ID',
        dataIndex: 'meliOrderId',
        key: 'meliOrderId',
      },
      {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => renderOrderStatus(status),
      },
      {
        title: 'Comprador',
        dataIndex: 'rawPayload',
        key: 'buyer',
        render: (payload: RawPayload | null | undefined) => formatOrderBuyer(payload),
      },
      {
        title: 'Monto',
        dataIndex: 'rawPayload',
        key: 'total_amount',
        render: (payload: RawPayload | null | undefined) =>
          formatCurrency(payload?.total_amount || 0),
      },
      {
        title: 'Producto vendido',
        dataIndex: 'rawPayload',
        key: 'products',
        render: (payload: RawPayload | null | undefined) =>
          formatOrderProducts(payload),
      },
      {
        title: 'Fecha de venta',
        key: 'saleDate',
        render: (_: unknown, order: MeliOrderRow) => formatSaleDate(order),
      },
    ],
    [],
  );

  return (
    <Card
      title="Últimas Órdenes en Mercado Libre"
      extra={
        <Button
          icon={<SyncOutlined spin={syncingOrders} />}
          loading={syncingOrders}
          disabled={!status?.connected}
          onClick={handleSyncOrdersFromMeli}
          size="small"
        >
          Importar desde MeLi
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Text strong>Filtrar por fecha de venta:</Text>
        <RangePicker
          format="YYYY-MM-DD"
          allowClear
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

      <Table
        dataSource={filteredOrders}
        rowKey="meliOrderId"
        loading={ordersLoading}
        size="small"
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: ordersLoading
            ? 'Cargando...'
            : orders.length === 0
              ? 'No hay órdenes de Mercado Libre registradas aún'
              : 'No hay órdenes en el rango de fechas seleccionado',
        }}
        columns={columns}
      />
    </Card>
  );
}

export { formatOrderProducts, formatOrderBuyer, formatSaleDate, getOrderSaleDate, renderOrderStatus };

'use client';

// --- Importaciones de Librerías ---
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/es';
import esES from 'antd/locale/es_ES';
import { useDebounce } from 'use-debounce';

// --- Importaciones de Componentes de Ant Design ---
import {
  Tag,
  Button,
  Popconfirm,
  Select,
  message,
  Tooltip,
  Space,
  ConfigProvider,
  Card,
  Avatar,
  Badge,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  DeleteOutlined,
  PercentageOutlined,
  UserSwitchOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  SyncOutlined,
  CreditCardOutlined,
  CarOutlined,
  ShoppingOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

// --- Importaciones de Servicios y Tipos ---
import { orderService } from '@/services/orderService';
import { Order, OrderStatus, PaymentMethod } from '@/types/order';
import type { TableProps } from 'antd';
import { useOrderExporter } from '@/hooks/useOrderExporter';
import { formatCurrency } from '@/utils/formatCurrency';

// --- Importaciones de Componentes Modulares ---
const OrdersFilters = dynamic(() => import('./components/OrdersFilters'), { ssr: false });
const OrdersStats = dynamic(() => import('./components/OrdersStats'), { ssr: false });
const OrdersTable = dynamic(() => import('./components/OrdersTable'), { ssr: false });

// --- Configuración de Dayjs ---
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('es');

const { Text, Title } = Typography;

// --- Tipos y Constantes ---
type Filters = {
  status?: string[];
  paymentMethod?: string[];
  dateRange?: [Dayjs | null, Dayjs | null];
  sellerId?: string[];
  promoCodeApplied?: string[];
  searchTerm?: string;
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  APPROVED: { label: 'Pagado', color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  SHIPPED: { label: 'Enviado', color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
  CANCELLED: { label: 'Cancelado', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  DECLINED: { label: 'Rechazado', color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' },
};

const PAYMENT_METHOD_OPTIONS = [
  { value: 'WOMPI', text: '💳 Wompi (Online)' },
  { value: 'CONTRAENTREGA', text: '🚚 Contraentrega (Destino)' },
  { value: 'MERCADO_LIBRE', text: '📦 Mercado Libre' },
  { value: 'PAYU', text: '🏦 PayU' },
];

export default function OrdersPage() {
  // --- Estados ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  // Estados de filtros
  const [filters, setFilters] = useState<Filters>({});
  const [quickFilter, setQuickFilter] = useState<string>('ALL');
  const [dateRangeValue, setDateRangeValue] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(rawSearchTerm, 300);

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const { isDownloading, downloadReport } = useOrderExporter();

  // --- Carga de Datos ---
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('❌ Error al cargar órdenes:', error);
      message.error('Hubo un error al cargar las órdenes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Actualizar término de búsqueda con debounce
  useEffect(() => {
    setFilters((prev) => ({ ...prev, searchTerm: debouncedSearchTerm || undefined }));
  }, [debouncedSearchTerm]);

  // --- Opciones de filtro para los Selects ---
  const statusOptions = useMemo(() => {
    return Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
      text: label,
      value,
    }));
  }, []);

  const sellerFilters = useMemo(() => {
    const sellers = new Map<string, string>();
    orders.forEach((o) => {
      if (o.seller && o.sellerId) {
        sellers.set(o.sellerId, o.seller.name || `Cód. ${o.seller.code || o.sellerId.substring(0, 4)}`);
      }
    });
    return Array.from(sellers.entries()).map(([value, text]) => ({ text, value }));
  }, [orders]);

  const promoFilters = useMemo(() => {
    const promos = new Set<string>();
    orders.forEach((o) => {
      if (o.promoCodeApplied) {
        promos.add(o.promoCodeApplied);
      }
    });
    return Array.from(promos).map((code) => ({ text: code, value: code }));
  }, [orders]);

  // --- Filtrado Inteligente de Órdenes ---
  const filteredOrders = useMemo(() => {
    let data = [...orders];

    // Quick filter de botones superiores
    if (quickFilter === 'WOMPI') {
      data = data.filter((o) => o.paymentMethod === 'WOMPI');
    } else if (quickFilter === 'CONTRAENTREGA') {
      data = data.filter((o) => o.paymentMethod === 'CONTRAENTREGA');
    } else if (quickFilter === 'PENDING') {
      data = data.filter((o) => o.status === 'PENDING');
    } else if (quickFilter === 'APPROVED') {
      data = data.filter((o) => o.status === 'APPROVED');
    } else if (quickFilter === 'SHIPPED') {
      data = data.filter((o) => o.status === 'SHIPPED');
    }

    // Búsqueda textual: cliente, ID, refCode, teléfono o email
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase().trim();
      data = data.filter((o) => {
        return (
          o.customerName?.toLowerCase().includes(term) ||
          o.id.toString().includes(term) ||
          o.referenceCode?.toLowerCase().includes(term) ||
          o.phone?.includes(term) ||
          o.customerEmail?.toLowerCase().includes(term)
        );
      });
    }

    // Filtro por Estado
    if (filters.status?.length) {
      data = data.filter((o) => filters.status!.includes(o.status));
    }

    // Filtro por Método de Pago
    if (filters.paymentMethod?.length) {
      data = data.filter((o) => filters.paymentMethod!.includes(o.paymentMethod));
    }

    // Filtro por Vendedor
    if (filters.sellerId?.length) {
      data = data.filter((o) => o.sellerId && filters.sellerId!.includes(o.sellerId));
    }

    // Filtro por Código Promocional
    if (filters.promoCodeApplied?.length) {
      data = data.filter((o) => o.promoCodeApplied && filters.promoCodeApplied!.includes(o.promoCodeApplied));
    }

    // Filtro por Fechas
    if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
      const [start, end] = filters.dateRange;
      data = data.filter((o) => {
        const date = dayjs(o.createdAt);
        return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day');
      });
    }

    return data;
  }, [filters, orders, quickFilter]);

  // --- Estadísticas Calculadas (Con Wompi & Contraentrega) ---
  const stats = useMemo(() => {
    const totalGeneral = filteredOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    const orderCount = filteredOrders.length;
    const avgTicket = orderCount > 0 ? totalGeneral / orderCount : 0;

    const wompiOrders = filteredOrders.filter((o) => o.paymentMethod === 'WOMPI');
    const wompiTotal = wompiOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);

    const contraentregaOrders = filteredOrders.filter((o) => o.paymentMethod === 'CONTRAENTREGA');
    const contraentregaTotal = contraentregaOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);

    return {
      totalGeneral,
      orderCount,
      avgTicket,
      wompiCount: wompiOrders.length,
      wompiTotal,
      contraentregaCount: contraentregaOrders.length,
      contraentregaTotal,
    };
  }, [filteredOrders]);

  // Conteos globales para los tabs
  const globalCounts = useMemo(() => {
    return {
      wompi: orders.filter((o) => o.paymentMethod === 'WOMPI').length,
      contraentrega: orders.filter((o) => o.paymentMethod === 'CONTRAENTREGA').length,
      pending: orders.filter((o) => o.status === 'PENDING').length,
    };
  }, [orders]);

  // --- Handlers ---
  const handleStatusChange = async (id: number, status: OrderStatus) => {
    setUpdating(id);
    try {
      await orderService.updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      message.success(`Orden #${id} actualizada a "${STATUS_CONFIG[status].label}"`);
    } catch (error) {
      console.error('❌ Error al actualizar estado:', error);
      message.error('No se pudo actualizar el estado. Inténtalo de nuevo.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await orderService.deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      message.success(`Orden #${id} eliminada correctamente`);
    } catch (error) {
      console.error('❌ Error al eliminar orden:', error);
      message.error('No se pudo eliminar la orden. Inténtalo de nuevo.');
    }
  };

  const handleSelectFilterChange = (
    key: 'status' | 'paymentMethod' | 'sellerId' | 'promoCodeApplied',
    value: string[]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value.length > 0 ? value : undefined,
    }));
  };

  const handleDateFilter = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateRangeValue(dates);
    setFilters((prev) => ({ ...prev, dateRange: dates || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    setQuickFilter('ALL');
    setDateRangeValue(null);
    setRawSearchTerm('');
    message.info('Filtros restablecidos');
  };

  const handleRowClick = (record: Order) => {
    setExpandedRowKeys((prev) => (prev.includes(record.id) ? [] : [record.id]));
  };

  const handleExpand = (expanded: boolean, record: Order) => {
    setExpandedRowKeys(expanded ? [record.id] : []);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'excel') {
      const pendingExport = filteredOrders.filter((o) => o.status !== 'SHIPPED');
      downloadReport(format, pendingExport);
      return;
    }
    downloadReport(format, filteredOrders);
  };

  // --- Columnas Compactas, Responsivas y Profesionales ---
  const columns: TableProps<Order>['columns'] = useMemo(
    () => [
      {
        title: 'Orden',
        key: 'orderId',
        width: 140,
        sorter: (a, b) => a.id - b.id,
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#0A2A66',
                  background: '#f0f5ff',
                  padding: '1px 6px',
                  borderRadius: 4,
                  border: '1px solid #d6e4ff',
                }}
              >
                #{record.id}
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 120,
              }}
              title={record.referenceCode}
            >
              {record.referenceCode}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {dayjs(record.createdAt).format('DD MMM, h:mm a')}
            </span>
          </div>
        ),
      },
      {
        title: 'Cliente & Destino',
        key: 'customer',
        width: 190,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
              {record.customerName}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 1 }}>
              {record.city ? `${record.city}${record.department ? `, ${record.department}` : ''}` : 'Sin ciudad'}
            </div>
            {record.phone && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                Tel: {record.phone}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Método de Pago',
        dataIndex: 'paymentMethod',
        key: 'paymentMethod',
        width: 160,
        render: (method: PaymentMethod, record: Order) => {
          const isWompi = method === 'WOMPI';
          const isContra = method === 'CONTRAENTREGA';
          const isMeli = method === 'MERCADO_LIBRE';

          return (
            <div>
              {isWompi ? (
                <Tag
                  color="blue"
                  icon={<CreditCardOutlined />}
                  style={{ fontWeight: 600, borderRadius: 6, margin: 0, padding: '2px 8px' }}
                >
                  Wompi
                </Tag>
              ) : isContra ? (
                <Tag
                  color="orange"
                  icon={<CarOutlined />}
                  style={{ fontWeight: 600, borderRadius: 6, margin: 0, padding: '2px 8px' }}
                >
                  Contraentrega
                </Tag>
              ) : isMeli ? (
                <Tag
                  color="gold"
                  icon={<ShoppingOutlined />}
                  style={{ fontWeight: 600, borderRadius: 6, margin: 0, padding: '2px 8px' }}
                >
                  Mercado Libre
                </Tag>
              ) : (
                <Tag color="purple" style={{ borderRadius: 6, margin: 0, padding: '2px 8px' }}>
                  {method || 'Otro'}
                </Tag>
              )}

              {record.shippingCost && record.shippingCost > 0 ? (
                <div style={{ fontSize: 10, color: '#059669', marginTop: 3, fontWeight: 500 }}>
                  + {formatCurrency(record.shippingCost)} envío
                </div>
              ) : (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                  Envío incluido / gratis
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: 'Productos',
        key: 'products',
        width: 140,
        render: (_, record) => {
          const count = record.products?.length ?? 0;
          if (count === 0) return <Text type="secondary" style={{ fontSize: 12 }}>Sin productos</Text>;

          const tooltipContent = record.products
            .map((p) => `${p.product?.name || 'Producto'} × ${p.quantity}`)
            .join(', ');

          return (
            <Tooltip title={tooltipContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar.Group max={{ count: 2 }} size="small">
                  {record.products.map((p) => (
                    <Avatar
                      key={p.id}
                      src={p.product?.imageUrl || '/placeholder.png'}
                      size="small"
                      style={{ border: '1px solid #e2e8f0' }}
                    />
                  ))}
                </Avatar.Group>
                <Tag style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                  {count} {count === 1 ? 'ítem' : 'ítems'}
                </Tag>
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 140,
        sorter: (a, b) => a.total - b.total,
        render: (total: number, record: Order) => (
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0A2A66' }}>
              {formatCurrency(total)}
            </span>
            <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
              {record.promoCodeApplied && (
                <Tag color="purple" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                  <PercentageOutlined style={{ marginRight: 2 }} />
                  {record.promoCodeApplied}
                </Tag>
              )}
              {record.seller && (
                <Tag color="cyan" style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                  <UserSwitchOutlined style={{ marginRight: 2 }} />
                  {record.seller.code || 'Vendedor'}
                </Tag>
              )}
            </div>
          </div>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (status: OrderStatus, record: Order) => {
          const cfg = STATUS_CONFIG[status] || {
            label: status,
            color: '#64748b',
            bg: '#f1f5f9',
            border: '#e2e8f0',
          };

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Select<OrderStatus>
                value={status}
                onChange={(value) => handleStatusChange(record.id, value)}
                loading={updating === record.id}
                size="small"
                style={{ width: '100%' }}
                popupMatchSelectWidth={false}
              >
                {Object.entries(STATUS_CONFIG).map(([value, item]) => (
                  <Select.Option key={value} value={value as OrderStatus}>
                    <Badge color={item.color} text={item.label} />
                  </Select.Option>
                ))}
              </Select>
            </div>
          );
        },
      },
      {
        title: 'Acciones',
        key: 'actions',
        align: 'center',
        width: 80,
        render: (_, record) => {
          const isExpanded = expandedRowKeys.includes(record.id);

          return (
            <Space size={4}>
              <Tooltip title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}>
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined style={{ color: isExpanded ? '#0A2A66' : '#64748b' }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(record);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="¿Eliminar orden?"
                description="Esta acción no se puede deshacer."
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(record.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Sí, eliminar"
                cancelText="No"
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [expandedRowKeys, updating]
  );

  return (
    <ConfigProvider locale={esES}>
      <div className="p-4 sm:p-6" style={{ background: '#f8fafc', minHeight: '100vh' }}>
        {/* Cabecera Principal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Title level={2} style={{ margin: 0, color: '#0A2A66', fontSize: 24 }}>
                Gestión de Órdenes
              </Title>
              <Tag color="blue" style={{ fontSize: 13, borderRadius: 12, padding: '2px 10px' }}>
                {orders.length} totales
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Supervisa pagos online Wompi, despachos contraentrega y rastreo de envíos
            </Text>
          </div>

          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchOrders} loading={loading}>
              Actualizar
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={() => handleExport('excel')} loading={isDownloading}>
              Excel
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={() => handleExport('pdf')} loading={isDownloading}>
              PDF
            </Button>
            <Popconfirm
              title="¿Procesar la cola de emails para todas las órdenes pendientes?"
              onConfirm={async () => {
                try {
                  message.loading({ content: 'Procesando colas...', key: 'flushAll' });
                  const res = await fetch('/api/admin/emails/flush-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                  });
                  const payload = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    message.error({ content: payload?.error || 'Error procesando colas', key: 'flushAll' });
                  } else {
                    message.success({
                      content: `Proceso completado: ${payload.processed ?? 0} correos`,
                      key: 'flushAll',
                    });
                  }
                } catch (err) {
                  console.error(err);
                  message.error({ content: 'Error procesando colas', key: 'flushAll' });
                }
              }}
              okText="Sí, procesar"
              cancelText="Cancelar"
            >
              <Button icon={<SyncOutlined />} danger>
                Procesar emails
              </Button>
            </Popconfirm>
          </Space>
        </div>

        {/* Tarjetas de Estadísticas Senior */}
        <OrdersStats stats={stats} loading={loading} />

        {/* Sección de Filtros y Tabla */}
        <OrdersFilters
          rawSearchTerm={rawSearchTerm}
          dateRangeValue={dateRangeValue}
          statusFilter={filters.status}
          paymentMethodFilter={filters.paymentMethod}
          sellerFilter={filters.sellerId}
          promoFilter={filters.promoCodeApplied}
          quickFilter={quickFilter}
          statusOptions={statusOptions}
          paymentMethodOptions={PAYMENT_METHOD_OPTIONS}
          sellerOptions={sellerFilters}
          promoOptions={promoFilters}
          filteredCount={filteredOrders.length}
          totalCount={orders.length}
          wompiCount={globalCounts.wompi}
          contraentregaCount={globalCounts.contraentrega}
          pendingCount={globalCounts.pending}
          onSearchChange={setRawSearchTerm}
          onDateChange={handleDateFilter}
          onFilterChange={handleSelectFilterChange}
          onQuickFilterChange={setQuickFilter}
          onClearFilters={clearFilters}
        />

        <Card
          bordered
          style={{
            borderRadius: 12,
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
          styles={{ body: { padding: '8px 12px' } }}
        >
          <OrdersTable
            orders={filteredOrders}
            columns={columns}
            loading={loading}
            expandedRowKeys={expandedRowKeys}
            totalSummary={stats.totalGeneral}
            hasData={orders.length > 0}
            onTableChange={() => {}}
            onRowClick={handleRowClick}
            onExpand={handleExpand}
          />
        </Card>
      </div>
    </ConfigProvider>
  );
}

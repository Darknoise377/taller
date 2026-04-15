'use client';

// --- Importaciones de Librerías ---
import React, { useEffect, useState, useMemo } from 'react';
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
  Row, // <-- Añadido para la maquetación
  Col, // <-- Añadido para la maquetación
} from 'antd';
import {
  DeleteOutlined,
  PercentageOutlined,
  UserSwitchOutlined,
  FilePdfOutlined, // <-- Añadido para el botón de exportación
  FileExcelOutlined, // <-- Añadido para el botón de exportación
} from '@ant-design/icons';

// --- Importaciones de Servicios y Tipos ---
import { orderService } from '@/services/orderService';
import { Order, OrderStatus } from '@/types/order';
import type { TableProps } from 'antd';
import { useOrderExporter } from '@/hooks/useOrderExporter';

// --- Importaciones de Componentes Modulares ---
import OrdersFilters from './components/OrdersFilters'; // <-- Componente de filtros (MODIFICADO)
import OrdersStats from './components/OrdersStats';
import OrdersTable from './components/OrdersTable';

// --- Configuración de Dayjs ---
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('es');

const { Text, Title } = Typography; // <-- Se añade Title

// --- Tipos y Constantes ---
type Filters = {
  status?: string[];
  paymentMethod?: string[];
  dateRange?: [Dayjs | null, Dayjs | null];
  sellerId?: string[];
  promoCodeApplied?: string[];
  searchTerm?: string;
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'gold' },
  APPROVED: { label: 'Pagado', color: 'green' },
  SHIPPED: { label: 'Completada (Enviada)', color: 'blue' },
  CANCELLED: { label: 'Cancelado', color: 'red' },
  DECLINED: { label: 'Rechazado', color: 'volcano' },
};

// --- Componente Principal de la Página de Órdenes ---
export default function OrdersPage() {
  // --- Estados ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  
  // Estados de filtros
  const [filters, setFilters] = useState<Filters>({});
  const [dateRangeValue, setDateRangeValue] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [rawSearchTerm, setRawSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(rawSearchTerm, 300);
  
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const { isDownloading, downloadReport } = useOrderExporter();

  // --- Carga de Datos ---
  useEffect(() => {
    const fetchOrders = async () => {
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
    };
    fetchOrders();
  }, []);

  // --- Efecto para actualizar filtros con el término buscado ---
  useEffect(() => {
    setFilters((prev) => ({ ...prev, searchTerm: debouncedSearchTerm || undefined }));
  }, [debouncedSearchTerm]);


  // --- Opciones de filtro para los Selects ---
  const statusOptions = useMemo(() => {
    return Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({
      text: label,
      value: value as string,
    }));
  }, []);

  const sellerFilters = useMemo(() => {
    const sellers = new Map<string, string>();
    orders.forEach(o => {
      if (o.seller && o.sellerId) {
        // Mejoramos la presentación si el nombre no está disponible
        sellers.set(o.sellerId, o.seller.name || `Cód. ${o.seller.code || o.sellerId.substring(0, 4)}`);
      }
    });
    return Array.from(sellers.entries()).map(([value, text]) => ({ text, value }));
  }, [orders]);

  const promoFilters = useMemo(() => {
    const promos = new Set<string>();
    orders.forEach(o => {
      if (o.promoCodeApplied) {
        promos.add(o.promoCodeApplied);
      }
    });
    return Array.from(promos).map(code => ({ text: code, value: code }));
  }, [orders]);

  // --- Memorización de Órdenes Filtradas (Lógica de filtrado) ---
  const filteredOrders = useMemo(() => {
    let data = [...orders];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase().trim();
      data = data.filter((o) =>
        o.customerName.toLowerCase().includes(term) ||
        o.id.toString().includes(term)
      );
    }
    // Lógica para los filtros de Selects
    if (filters.status?.length) {
      data = data.filter((o) => filters.status!.includes(o.status));
    }
    if (filters.sellerId?.length) {
      data = data.filter((o) => o.sellerId && filters.sellerId!.includes(o.sellerId));
    }
    if (filters.promoCodeApplied?.length) {
      data = data.filter((o) => o.promoCodeApplied && filters.promoCodeApplied!.includes(o.promoCodeApplied));
    }
    
    // Lógica para el filtro de fechas
    if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
      const [start, end] = filters.dateRange;
      data = data.filter((o) => {
        const date = dayjs(o.createdAt);
        return date.isSameOrAfter(start, 'day') && date.isSameOrBefore(end, 'day');
      });
    }
    // El filtro de paymentMethod sigue disponible si lo necesitas, pero se omite aquí por brevedad.
    // if (filters.paymentMethod?.length) { ... } 

    return data;
  }, [filters, orders]);

  // --- Estadísticas calculadas ---
  const stats = useMemo(() => {
    const totalGeneral = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = filteredOrders.length;
    const avgTicket = orderCount > 0 ? totalGeneral / orderCount : 0;
    return { totalGeneral, orderCount, avgTicket };
  }, [filteredOrders]);


  // --- Manejadores de Eventos (Handlers) ---
  
  // (handleStatusChange y handleDelete sin cambios)
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

  // --- ⚠️ MODIFICADO: Maneja cambios en Selects (Estado, Vendedor, Promoción) ---
  const handleSelectFilterChange = (
    key: 'status' | 'sellerId' | 'promoCodeApplied', // Se omite paymentMethod para simplificar
    value: string[]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value.length > 0 ? value : undefined, // Si está vacío, quita el filtro
    }));
  };

  // --- ⚠️ MODIFICADO: handleTableChange ahora solo se ocupa de la ordenación si es necesario ---
  const handleTableChange: TableProps<Order>['onChange'] = () => {
    // Ya NO usamos tableFilters para actualizar el estado de filtros.
    // Aquí puedes implementar la lógica de ordenación si tus columnas tienen `sorter`.
    // console.log('Cambio de tabla (paginación/ordenación):', pagination, sorter);
  };

  const handleDateFilter = (dates: [Dayjs | null, Dayjs | null] | null) => {
    setDateRangeValue(dates);
    setFilters((prev) => ({ ...prev, dateRange: dates || undefined }));
  };

  // --- ⚠️ MODIFICADO: Limpia la UI y la lógica de filtros ---
  const clearFilters = () => {
    setFilters({}); // Limpia la lógica (Status, Seller, Promo, DateRange)
    setDateRangeValue(null); // Limpia la UI de fecha
    setRawSearchTerm(''); // Limpia la UI de búsqueda
    message.info('Filtros limpiados');
  };

  // (handleRowClick, handleExpand, handleExport sin cambios)
  const handleRowClick = (record: Order) => {
    setExpandedRowKeys((prev) =>
      prev.includes(record.id) ? [] : [record.id]
    );
  };
  
  const handleExpand = (expanded: boolean, record: Order) => {
    setExpandedRowKeys(expanded ? [record.id] : []);
  };
  
  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'excel') {
      // Por defecto, no exportamos órdenes completadas (SHIPPED)
      const pendingExport = filteredOrders.filter((o) => o.status !== 'SHIPPED');
      downloadReport(format, pendingExport);
      return;
    }

    downloadReport(format, filteredOrders);
  };

  // --- ⚠️ MODIFICADO: Definición de Columnas - Se eliminan los `filters` ---
  const columns: TableProps<Order>['columns'] = [
    {
      title: 'ID Orden',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      sorter: (a, b) => a.id - b.id,
      render: (id) => <Text strong>#{id}</Text>
    },
    {
      title: 'Cliente',
      key: 'customerName',
      width: 200,
      // ... (renderizado sin cambios)
      render: (_, record) => (
        <div>
          <Text>{record.customerName}</Text><br/>
          <Text type="secondary" style={{ fontSize: '12px' }}>{dayjs(record.createdAt).format('DD MMM YYYY, h:mm a')}</Text>
        </div>
      ),
    },
    {
      title: 'Vendedor',
      dataIndex: ['seller', 'name'],
      key: 'sellerId',
      width: 150,
      // ❌ REMOVIDO: filters: sellerFilters,
      render: (name: string, record: Order) => (
        record.seller ? (
          <Tooltip title={`Código: ${record.seller.code}`}>
            <span><UserSwitchOutlined style={{ marginRight: 4 }} /> {name || 'N/A'}</span>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Promoción',
      dataIndex: 'promoCodeApplied',
      key: 'promoCodeApplied',
      width: 120,
      // ❌ REMOVIDO: filters: promoFilters,
      render: (code: string) => (
        code ? <Tag color="purple" icon={<PercentageOutlined />}>{code}</Tag> : <Text type="secondary">-</Text>
      ),
    },
    {
      title: 'Productos',
      key: 'products',
      width: 180,
      // ... (renderizado sin cambios)
      render: (_, record) => (
        record.products?.length > 0 ? (
          <Tooltip title={record.products.map(p => `${p.product?.name} × ${p.quantity}`).join(', ')}>
            <Avatar.Group max={{ count: 3 }}>
              {record.products.map((p) => (
                <Avatar key={p.id} src={p.product?.imageUrl || '/placeholder.png'} />
              ))}
            </Avatar.Group>
          </Tooltip>
        ) : <Text type="secondary">Sin productos</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      sorter: (a, b) => a.total - b.total,
      render: (total: number) => <Text strong>${total.toLocaleString('es-CO')}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      // ❌ REMOVIDO: filters: Object.entries(STATUS_CONFIG).map(...)
      render: (status: OrderStatus, record: Order) => (
        <Select<OrderStatus>
          value={status}
          onChange={(value) => handleStatusChange(record.id, value)}
          loading={updating === record.id}
          style={{ width: '100%' }}
        >
          {Object.entries(STATUS_CONFIG).map(([value, { label, color }]) => (
            <Select.Option key={value} value={value as OrderStatus}>
              <Badge color={color} text={label} />
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      align: 'center',
      width: 80,
      // ... (renderizado sin cambios)
      render: (_, record) => (
        <Popconfirm
          title="¿Eliminar esta orden?"
          onConfirm={(e) => {
              e?.stopPropagation(); 
              handleDelete(record.id);
          }}
          onCancel={(e) => e?.stopPropagation()}
          okText="Sí, eliminar"
          cancelText="No"
        >
          <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      ),
    },
  ];

  // --- Renderizado del Componente ---
  return (
    <ConfigProvider locale={esES}>
      <div className="p-4 sm:p-6" style={{ background: '#f0f2f5' }}>
        
        {/* --- CARD SUPERIOR: TÍTULO, BOTONES Y STATS --- */}
        <Card>
          <Row gutter={[16, 16]} justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                Gestión de Órdenes
              </Title>
            </Col>
            <Col xs={24} md="auto">
              <Space wrap style={{ width: '100%' }}>
                {/* ⚠️ Botones de Exportar se mantienen aquí, el de Limpiar va en OrdersFilters */}
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => handleExport('pdf')}
                  loading={isDownloading}
                >
                  PDF
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => handleExport('excel')}
                  loading={isDownloading}
                >
                  Excel
                </Button>
              </Space>
            </Col>
          </Row>
          
          <OrdersStats stats={stats} loading={loading} />
        </Card>

        {/* --- CARD INFERIOR: FILTROS Y TABLA (La sección que querías mover) --- */}
        <Card style={{ marginTop: 24 }}>
          {/* 👇 La nueva barra de filtros se posiciona aquí, justo encima de la tabla. 👇 */}
          <OrdersFilters
            rawSearchTerm={rawSearchTerm}
            dateRangeValue={dateRangeValue}
            
            // Valores de filtros de Select
            statusFilter={filters.status}
            sellerFilter={filters.sellerId}
            promoFilter={filters.promoCodeApplied}
            
            // Opciones de Select
            statusOptions={statusOptions}
            sellerOptions={sellerFilters}
            promoOptions={promoFilters}
            
            // Handlers
            onSearchChange={setRawSearchTerm}
            onDateChange={handleDateFilter}
            onFilterChange={handleSelectFilterChange} // Nuevo handler para Selects
            onClearFilters={clearFilters}
            
            // Props de exportación eliminadas de este componente ya que se movieron arriba
          />
          
          <OrdersTable
            orders={filteredOrders}
            columns={columns}
            loading={loading}
            expandedRowKeys={expandedRowKeys}
            totalSummary={stats.totalGeneral}
            hasData={orders.length > 0}
            onTableChange={handleTableChange}
            onRowClick={handleRowClick}
            onExpand={handleExpand}
          />
        </Card>
      </div>
    </ConfigProvider>
  );
}
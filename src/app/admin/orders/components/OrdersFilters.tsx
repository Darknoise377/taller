'use client';

import React from 'react';
import { DatePicker, Row, Col, Input, Select, Button, Space, Tag, Typography } from 'antd';
import {
  SearchOutlined,
  ClearOutlined,
  CreditCardOutlined,
  CarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

export type FilterOption = {
  value: string;
  text: string;
};

type OrdersFiltersProps = {
  // Valores de los filtros
  rawSearchTerm: string;
  dateRangeValue: [Dayjs | null, Dayjs | null] | null;
  statusFilter: string[] | undefined;
  paymentMethodFilter: string[] | undefined;
  sellerFilter: string[] | undefined;
  promoFilter: string[] | undefined;
  quickFilter: string;

  // Opciones para los <Select>
  statusOptions: FilterOption[];
  paymentMethodOptions: FilterOption[];
  sellerOptions: FilterOption[];
  promoOptions: FilterOption[];

  // Conteos
  filteredCount: number;
  totalCount: number;
  wompiCount: number;
  contraentregaCount: number;
  pendingCount: number;

  // Handlers
  onSearchChange: (value: string) => void;
  onDateChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onFilterChange: (
    key: 'status' | 'paymentMethod' | 'sellerId' | 'promoCodeApplied',
    value: string[]
  ) => void;
  onQuickFilterChange: (key: string) => void;
  onClearFilters: () => void;
};

const OrdersFilters: React.FC<OrdersFiltersProps> = ({
  rawSearchTerm,
  dateRangeValue,
  statusFilter,
  paymentMethodFilter,
  sellerFilter,
  promoFilter,
  quickFilter,
  statusOptions,
  paymentMethodOptions,
  sellerOptions,
  promoOptions,
  filteredCount,
  totalCount,
  wompiCount,
  contraentregaCount,
  pendingCount,
  onSearchChange,
  onDateChange,
  onFilterChange,
  onQuickFilterChange,
  onClearFilters,
}) => {
  const hasActiveFilters =
    Boolean(rawSearchTerm) ||
    Boolean(dateRangeValue) ||
    Boolean(statusFilter?.length) ||
    Boolean(paymentMethodFilter?.length) ||
    Boolean(sellerFilter?.length) ||
    Boolean(promoFilter?.length) ||
    quickFilter !== 'ALL';

  return (
    <div
      style={{
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        marginBottom: 16,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* 1. Barra de Accesos Rápidos (Quick Pills) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 10,
          marginBottom: 14,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
          Vista rápida:
        </span>

        <Button
          size="small"
          type={quickFilter === 'ALL' ? 'primary' : 'default'}
          onClick={() => onQuickFilterChange('ALL')}
          style={{
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: quickFilter === 'ALL' ? '#0A2A66' : undefined,
            borderColor: quickFilter === 'ALL' ? '#0A2A66' : undefined,
          }}
        >
          Todas ({totalCount})
        </Button>

        <Button
          size="small"
          type={quickFilter === 'WOMPI' ? 'primary' : 'default'}
          icon={<CreditCardOutlined style={{ color: quickFilter === 'WOMPI' ? '#ffffff' : '#0284c7' }} />}
          onClick={() => onQuickFilterChange('WOMPI')}
          style={{
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: quickFilter === 'WOMPI' ? '#0284c7' : undefined,
            borderColor: quickFilter === 'WOMPI' ? '#0284c7' : undefined,
          }}
        >
          Wompi ({wompiCount})
        </Button>

        <Button
          size="small"
          type={quickFilter === 'CONTRAENTREGA' ? 'primary' : 'default'}
          icon={<CarOutlined style={{ color: quickFilter === 'CONTRAENTREGA' ? '#ffffff' : '#d97706' }} />}
          onClick={() => onQuickFilterChange('CONTRAENTREGA')}
          style={{
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: quickFilter === 'CONTRAENTREGA' ? '#d97706' : undefined,
            borderColor: quickFilter === 'CONTRAENTREGA' ? '#d97706' : undefined,
          }}
        >
          Contraentrega ({contraentregaCount})
        </Button>

        <Button
          size="small"
          type={quickFilter === 'PENDING' ? 'primary' : 'default'}
          icon={<ClockCircleOutlined style={{ color: quickFilter === 'PENDING' ? '#ffffff' : '#eab308' }} />}
          onClick={() => onQuickFilterChange('PENDING')}
          style={{
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: quickFilter === 'PENDING' ? '#ca8a04' : undefined,
            borderColor: quickFilter === 'PENDING' ? '#ca8a04' : undefined,
          }}
        >
          Pendientes ({pendingCount})
        </Button>

        <Button
          size="small"
          type={quickFilter === 'APPROVED' ? 'primary' : 'default'}
          icon={<CheckCircleOutlined style={{ color: quickFilter === 'APPROVED' ? '#ffffff' : '#10b981' }} />}
          onClick={() => onQuickFilterChange('APPROVED')}
          style={{
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: quickFilter === 'APPROVED' ? '#059669' : undefined,
            borderColor: quickFilter === 'APPROVED' ? '#059669' : undefined,
          }}
        >
          Pagadas
        </Button>

        <Button
          size="small"
          type={quickFilter === 'SHIPPED' ? 'primary' : 'default'}
          icon={<SendOutlined style={{ color: quickFilter === 'SHIPPED' ? '#ffffff' : '#6366f1' }} />}
          onClick={() => onQuickFilterChange('SHIPPED')}
          style={{
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            background: quickFilter === 'SHIPPED' ? '#4f46e5' : undefined,
            borderColor: quickFilter === 'SHIPPED' ? '#4f46e5' : undefined,
          }}
        >
          Enviadas
        </Button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {filteredCount === totalCount
              ? `${totalCount} órdenes`
              : `${filteredCount} de ${totalCount} órdenes`}
          </Text>
        </div>
      </div>

      {/* 2. Barra de Filtros Principales (Búsqueda + Fechas + Selects) */}
      <Row gutter={[12, 12]} align="middle">
        <Col xs={24} sm={12} lg={7}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Buscar por #ID, cliente, celular, ref o email..."
            value={rawSearchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            style={{ borderRadius: 8 }}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <RangePicker
            format="DD/MM/YYYY"
            onChange={onDateChange}
            style={{ width: '100%', borderRadius: 8 }}
            value={dateRangeValue}
            placeholder={['Fecha inicio', 'Fecha fin']}
          />
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            style={{ width: '100%' }}
            placeholder="💳 Método Pago"
            value={paymentMethodFilter}
            onChange={(value) => onFilterChange('paymentMethod', value)}
            options={paymentMethodOptions.map((opt) => ({ label: opt.text, value: opt.value }))}
          />
        </Col>

        <Col xs={12} sm={8} lg={4}>
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            style={{ width: '100%' }}
            placeholder="🏷️ Estado"
            value={statusFilter}
            onChange={(value) => onFilterChange('status', value)}
            options={statusOptions.map((opt) => ({ label: opt.text, value: opt.value }))}
          />
        </Col>

        <Col xs={24} sm={8} lg={3}>
          {hasActiveFilters ? (
            <Button
              icon={<ClearOutlined />}
              onClick={onClearFilters}
              style={{ width: '100%', borderRadius: 8 }}
              danger
            >
              Limpiar
            </Button>
          ) : (
            <Button
              disabled
              style={{ width: '100%', borderRadius: 8, opacity: 0.5 }}
            >
              Filtros
            </Button>
          )}
        </Col>
      </Row>

      {/* Fila colapsable o secundaria si hay vendedores o promociones */}
      {(sellerOptions.length > 0 || promoOptions.length > 0) && (
        <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
          {sellerOptions.length > 0 && (
            <Col xs={12} sm={6}>
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                style={{ width: '100%' }}
                placeholder="👤 Vendedor"
                value={sellerFilter}
                onChange={(value) => onFilterChange('sellerId', value)}
                options={sellerOptions.map((opt) => ({ label: opt.text, value: opt.value }))}
                showSearch
              />
            </Col>
          )}
          {promoOptions.length > 0 && (
            <Col xs={12} sm={6}>
              <Select
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                style={{ width: '100%' }}
                placeholder="🎟️ Cupón Promo"
                value={promoFilter}
                onChange={(value) => onFilterChange('promoCodeApplied', value)}
                options={promoOptions.map((opt) => ({ label: opt.text, value: opt.value }))}
              />
            </Col>
          )}
        </Row>
      )}
    </div>
  );
};

export default OrdersFilters;

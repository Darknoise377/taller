'use client';

import React from 'react';
import { DatePicker, Row, Col, Input, Select, Button, Typography } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

// --- Tipos para las Props ---
type FilterOption = {
  value: string;
  text: string;
};

type OrdersFiltersProps = {
  // Valores de los filtros
  rawSearchTerm: string;
  dateRangeValue: [Dayjs | null, Dayjs | null] | null;
  statusFilter: string[] | undefined;
  sellerFilter: string[] | undefined;
  promoFilter: string[] | undefined;
  
  // Opciones para los <Select>
  statusOptions: FilterOption[];
  sellerOptions: FilterOption[];
  promoOptions: FilterOption[];

  // Handlers (funciones)
  onSearchChange: (value: string) => void;
  onDateChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onFilterChange: (key: 'status' | 'sellerId' | 'promoCodeApplied', value: string[]) => void;
  onClearFilters: () => void;
};

// --- Componente ---
const OrdersFilters: React.FC<OrdersFiltersProps> = ({
  rawSearchTerm,
  dateRangeValue,
  statusFilter,
  sellerFilter,
  promoFilter,
  statusOptions,
  sellerOptions,
  promoOptions,
  onSearchChange,
  onDateChange,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Fila 1: Búsqueda, Fechas y Botón limpiar */}
      <Row gutter={[16, 16]} align="bottom">
        <Col xs={24} md={12} lg={10}>
          <Text strong>Buscar</Text>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Por Cliente o ID de Orden..."
            value={rawSearchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} md={12} lg={10}>
          <Text strong>Fecha</Text>
          <RangePicker
            format="DD/MM/YYYY"
            onChange={onDateChange}
            style={{ width: '100%' }}
            value={dateRangeValue}
          />
        </Col>
        <Col xs={24} md={24} lg={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button 
            icon={<ClearOutlined />} 
            onClick={onClearFilters} 
            style={{ width: '100%' }}
          >
            Limpiar Todos los Filtros
          </Button>
        </Col>
      </Row>

      {/* Fila 2: Selects */}
      <Row gutter={[16, 16]} align="bottom" style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Text strong>Estado</Text>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Filtrar por estado"
            value={statusFilter}
            onChange={(value) => onFilterChange('status', value)}
            options={statusOptions.map(opt => ({ label: opt.text, value: opt.value }))}
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Vendedor</Text>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Filtrar por vendedor"
            value={sellerFilter}
            onChange={(value) => onFilterChange('sellerId', value)}
            options={sellerOptions.map(opt => ({ label: opt.text, value: opt.value }))}
            showSearch
          />
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Promoción</Text>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Filtrar por promoción"
            value={promoFilter}
            onChange={(value) => onFilterChange('promoCodeApplied', value)}
            options={promoOptions.map(opt => ({ label: opt.text, value: opt.value }))}
          />
        </Col>
      </Row>
    </div>
  );
};

export default OrdersFilters;
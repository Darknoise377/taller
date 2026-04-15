'use client';

import React from 'react';
import {
  Table,
  Tag,
  Avatar,
  Spin,
  Statistic,
  Descriptions,
  Empty,
  Space,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
import { Order } from '@/types/order';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  PercentageOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const shippingTextStyle: React.CSSProperties = {
  color: '#10b981',
};

// --- Componente para Renglón Expandido (Movido aquí) ---
const ExpandedRowContent: React.FC<{ record: Order }> = ({ record }) => (
  <Descriptions bordered column={{ xs: 1, sm: 2 }}>
    <Descriptions.Item label={<Space><UserOutlined/>Contacto</Space>}>
      <Text strong>{record.customerName}</Text><br/>
      <MailOutlined /> <Text type="secondary">{record.customerEmail}</Text><br/>
      <PhoneOutlined /> <Text type="secondary">{record.phone}</Text><br/>
      {record.cedula && <Text type="secondary">C.C: {record.cedula}</Text>}
    </Descriptions.Item>
    <Descriptions.Item label={<Space><HomeOutlined/>Dirección de Envío</Space>}>
      <Text style={shippingTextStyle}>{record.address || 'Sin dirección'}</Text><br/>
      <Text style={shippingTextStyle}>
        {(record.city || 'Sin ciudad')}{record.department ? `, ${record.department}` : ''}
        {record.postalCode ? ` · ${record.postalCode}` : ''}
      </Text>
    </Descriptions.Item>
    
    <Descriptions.Item label="Códigos Aplicados" span={2}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text>
          <UserSwitchOutlined style={{ marginRight: 8 }} />
          <strong>Vendedor:</strong> {record.seller ? `${record.seller.name} (Código: ${record.seller.code})` : 'N/A'}
        </Text>
        <Text>
          <PercentageOutlined style={{ marginRight: 8 }} />
          <strong>Promoción:</strong> {record.promoCodeApplied ? <Tag color="purple">{record.promoCodeApplied}</Tag> : 'N/A'}
        </Text>
      </Space>
    </Descriptions.Item>

    <Descriptions.Item label="Detalle de Productos" span={2}>
        {record.products?.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Avatar src={p.product?.imageUrl || '/placeholder.png'} style={{ marginRight: 12 }} />
                <div>
                    <Text>{p.product?.name || 'Producto no disponible'}</Text><br/>
                    <Text type="secondary">Cantidad: {p.quantity} | Precio Unit: ${p.product?.price != null ? p.product.price.toLocaleString('es-CO') : '0'}</Text>
                </div>
            </div>
        ))}
    </Descriptions.Item>
  </Descriptions>
);


// --- Props del Componente de Tabla ---
type OrdersTableProps = {
  orders: Order[];
  columns: TableProps<Order>['columns'];
  loading: boolean;
  expandedRowKeys: React.Key[];
  totalSummary: number;
  hasData: boolean; // Para saber si hay órdenes en total, antes de filtrar
  onTableChange: TableProps<Order>['onChange'];
  onRowClick: (record: Order) => void;
  onExpand: (expanded: boolean, record: Order) => void;
};

// --- Componente Principal de la Tabla ---
const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  columns,
  loading,
  expandedRowKeys,
  totalSummary,
  hasData,
  onTableChange,
  onRowClick,
  onExpand,
}) => {
  return (
    <Spin spinning={loading}>
      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        size="small"
        sticky
        pagination={{ pageSize: 10, showSizeChanger: true, responsive: true }}
        onChange={onTableChange}
        locale={{ 
          emptyText: 
            (hasData && orders.length === 0) 
              ? <Empty description="No se encontraron órdenes con esos filtros" /> 
              : <Empty description="Aún no hay órdenes registradas" /> 
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: {
            cursor: 'pointer',
            backgroundColor: expandedRowKeys.includes(record.id) ? '#e6f4ff' : undefined
          },
        })}
        expandable={{
          expandedRowRender: (record) => <ExpandedRowContent record={record} />,
          rowExpandable: () => true,
          expandedRowKeys,
          onExpand: onExpand,
        }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={5}> 
              <Text strong>Total General (Filtrado)</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <Statistic
                value={totalSummary}
                prefix="$"
                groupSeparator="."
                precision={0}
                valueStyle={{ fontSize: 16 }}
              />
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Spin>
  );
};

export default OrdersTable;
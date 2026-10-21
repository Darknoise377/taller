'use client';

import React, { useState } from 'react';
import {
  Table,
  Tag,
  Avatar,
  Spin,
  Statistic,
  Empty,
  Space,
  Typography,
  Input,
  Button,
  message,
  Card,
  Row,
  Col,
  Divider,
  Tooltip,
} from 'antd';
import type { TableProps } from 'antd';
import { Order } from '@/types/order';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  PercentageOutlined,
  UserSwitchOutlined,
  CreditCardOutlined,
  CarOutlined,
  CopyOutlined,
  CheckOutlined,
  CompassOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { FaWhatsapp } from 'react-icons/fa';

const { Text } = Typography;

// --- Componente para Renglón Expandido (Senior UI) ---
const ExpandedRowContent: React.FC<{ record: Order }> = ({ record }) => {
  const [trackingNumber, setTrackingNumber] = useState<string>(record.trackingNumber ?? '');
  const [trackingUrl, setTrackingUrl] = useState<string>(record.trackingUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: trackingNumber || null, trackingUrl: trackingUrl || null }),
      });
      if (!res.ok) throw new Error('Error actualizando la orden');
      message.success('Información de tracking guardada');
    } catch (err) {
      console.error(err);
      message.error('No se pudo guardar el tracking');
    } finally {
      setSaving(false);
    }
  };

  const handleFlush = async () => {
    setFlushing(true);
    try {
      const res = await fetch('/api/admin/emails/flush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ referenceCode: record.referenceCode }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Error procesando la cola');
      }
      message.success('Cola de emails procesada para la orden');
    } catch (err) {
      console.error(err);
      message.error('No se pudo procesar la cola de emails');
    } finally {
      setFlushing(false);
    }
  };

  const handleCopyRef = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(record.referenceCode);
      setCopiedRef(true);
      message.success('Referencia copiada');
      setTimeout(() => setCopiedRef(false), 2500);
    }
  };

  const handleOpenWhatsApp = () => {
    let phone = (record.phone || '').replace(/\D/g, '');
    if (phone.length === 10 && phone.startsWith('3')) {
      phone = `57${phone}`;
    }
    const msg = encodeURIComponent(
      `¡Hola ${record.customerName}! 👋 Te escribimos de *Motoservicio Taller A&R* con respecto a tu orden *#${record.id}* (Ref: ${record.referenceCode}).`
    );
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isContraentrega = record.paymentMethod === 'CONTRAENTREGA';
  const isWompi = record.paymentMethod === 'WOMPI';

  return (
    <div
      style={{
        background: '#f8fafc',
        padding: '16px 20px',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        margin: '6px 0',
      }}
    >
      {/* Header del detalle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Space wrap>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A2A66' }}>
            Detalle Orden #{record.id}
          </span>
          <Tag
            color="geekblue"
            style={{
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '2px 8px',
            }}
            onClick={handleCopyRef}
            title="Clic para copiar referencia"
          >
            Ref: {record.referenceCode}{' '}
            {copiedRef ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
          </Tag>

          {isContraentrega ? (
            <Tag color="orange" icon={<CarOutlined />} style={{ fontWeight: 600 }}>
              Pago Contraentrega (Cobro en Destino)
            </Tag>
          ) : isWompi ? (
            <Tag color="blue" icon={<CreditCardOutlined />} style={{ fontWeight: 600 }}>
              Pago Online Wompi
            </Tag>
          ) : (
            <Tag color="purple">{record.paymentMethod}</Tag>
          )}
        </Space>

        <Button
          size="small"
          icon={<FaWhatsapp style={{ color: '#25D366', fontSize: 14 }} />}
          onClick={handleOpenWhatsApp}
          style={{ borderColor: '#25D366', fontWeight: 600 }}
        >
          Contactar por WhatsApp
        </Button>
      </div>

      {/* Grid de 3 Columnas con la Información */}
      <Row gutter={[16, 16]}>
        {/* Columna 1: Cliente & Contacto */}
        <Col xs={24} md={8}>
          <Card
            size="small"
            title={
              <Space>
                <UserOutlined style={{ color: '#0A2A66' }} />
                <span>Cliente & Contacto</span>
              </Space>
            }
            bordered
            style={{ height: '100%', borderRadius: 8 }}
          >
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <Text strong>{record.customerName}</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                <PhoneOutlined />
                <span>{record.phone || 'Sin teléfono'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                <MailOutlined />
                <span style={{ wordBreak: 'break-all' }}>{record.customerEmail}</span>
              </div>
              {record.cedula && (
                <div style={{ color: '#64748b' }}>
                  <span>C.C / NIT: </span>
                  <Text strong>{record.cedula}</Text>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* Columna 2: Destino & Envío */}
        <Col xs={24} md={8}>
          <Card
            size="small"
            title={
              <Space>
                <HomeOutlined style={{ color: '#0A2A66' }} />
                <span>Dirección de Despacho</span>
              </Space>
            }
            bordered
            style={{ height: '100%', borderRadius: 8 }}
          >
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#0f172a', fontWeight: 500 }}>
                {record.address || 'Sin dirección registrada'}
              </div>
              <div style={{ color: '#475569' }}>
                <span>
                  {record.city || 'Sin ciudad'}
                  {record.department ? `, ${record.department}` : ''}
                </span>
                {record.postalCode ? ` · C.P. ${record.postalCode}` : ''}
              </div>

              <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                {record.seller && (
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                    <UserSwitchOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                    Vendedor: <strong>{record.seller.name}</strong> ({record.seller.code})
                  </div>
                )}
                {record.promoCodeApplied && (
                  <div style={{ fontSize: 12, color: '#7e22ce' }}>
                    <PercentageOutlined style={{ marginRight: 4 }} />
                    Cupón: <Tag color="purple">{record.promoCodeApplied}</Tag>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>

        {/* Columna 3: Productos Comprados */}
        <Col xs={24} md={8}>
          <Card
            size="small"
            title={
              <Space>
                <span>📦 Productos ({record.products?.length ?? 0})</span>
              </Space>
            }
            bordered
            style={{ height: '100%', borderRadius: 8 }}
          >
            <div style={{ maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
              {record.products && record.products.length > 0 ? (
                record.products.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                      paddingBottom: 6,
                      borderBottom: '1px dashed #e2e8f0',
                    }}
                  >
                    <Avatar
                      shape="square"
                      size={36}
                      src={p.product?.imageUrl || '/placeholder.png'}
                      style={{ borderRadius: 6, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.product?.name || 'Producto'}
                      </div>
                      <div style={{ color: '#64748b' }}>
                        {p.quantity} x{' '}
                        {p.product?.price != null ? formatCurrency(p.product.price) : '—'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Sin productos registrados
                </Text>
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>Total a cobrar:</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0A2A66' }}>
                {formatCurrency(record.total)}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Sección Inferior: Guía y Tracking */}
      <div
        style={{
          marginTop: 14,
          padding: '12px 16px',
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <CompassOutlined style={{ color: '#0A2A66', fontSize: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0A2A66' }}>
            Información de Envío & Guía de Rastreo
          </span>
        </div>

        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8}>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Ej. Servientrega: 123456789"
              size="small"
              style={{ borderRadius: 6 }}
            />
          </Col>
          <Col xs={24} sm={10}>
            <Input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="URL de rastreo (opcional)"
              size="small"
              style={{ borderRadius: 6 }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <Button type="primary" size="small" onClick={handleSave} loading={saving} style={{ background: '#0A2A66' }}>
                Guardar Guía
              </Button>
              <Button size="small" onClick={handleFlush} loading={flushing} icon={<SendOutlined />}>
                Reenviar email
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
    </div>
  );
};

// --- Props del Componente de Tabla ---
type OrdersTableProps = {
  orders: Order[];
  columns: TableProps<Order>['columns'];
  loading: boolean;
  expandedRowKeys: React.Key[];
  totalSummary: number;
  hasData: boolean;
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
        size="middle"
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          pageSizeOptions: ['15', '30', '50', '100'],
          responsive: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} órdenes`,
        }}
        onChange={onTableChange}
        locale={{
          emptyText:
            hasData && orders.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No se encontraron órdenes con esos filtros"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Aún no hay órdenes registradas"
              />
            ),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: {
            cursor: 'pointer',
            backgroundColor: expandedRowKeys.includes(record.id) ? '#f0f7ff' : undefined,
            transition: 'background-color 0.2s ease',
          },
        })}
        expandable={{
          expandedRowRender: (record) => <ExpandedRowContent record={record} />,
          rowExpandable: () => true,
          expandedRowKeys,
          onExpand: onExpand,
        }}
        summary={() => (
          <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 600 }}>
            <Table.Summary.Cell index={0} colSpan={4}>
              <Text strong style={{ color: '#0A2A66' }}>
                Total General (Filtrado activo)
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} colSpan={4}>
              <Statistic
                value={totalSummary}
                prefix="$"
                groupSeparator="."
                precision={0}
                valueStyle={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}
              />
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Spin>
  );
};

export default OrdersTable;

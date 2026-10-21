'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Spin, Tooltip, Tag } from 'antd';
import {
  DollarCircleOutlined,
  ShoppingCartOutlined,
  CreditCardOutlined,
  CarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { motion, easeOut } from 'framer-motion';
import { formatCurrency } from '@/utils/formatCurrency';

export type OrdersStatsData = {
  totalGeneral: number;
  orderCount: number;
  avgTicket: number;
  wompiCount: number;
  wompiTotal: number;
  contraentregaCount: number;
  contraentregaTotal: number;
};

type OrdersStatsProps = {
  stats: OrdersStatsData;
  loading: boolean;
};

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: easeOut },
  }),
};

const OrdersStats: React.FC<OrdersStatsProps> = ({ stats, loading }) => {
  const cards = [
    {
      title: 'Ingresos Totales',
      value: formatCurrency(stats.totalGeneral),
      subtext: `Ticket prom: ${formatCurrency(stats.avgTicket)}`,
      icon: <DollarCircleOutlined style={{ fontSize: 22, color: '#10b981' }} />,
      iconBg: '#ecfdf5',
      borderColor: '#a7f3d0',
      tooltip: 'Suma total de órdenes visibles con los filtros actuales.',
      tag: null,
    },
    {
      title: 'Total Pedidos',
      value: `${stats.orderCount} ${stats.orderCount === 1 ? 'orden' : 'órdenes'}`,
      subtext: stats.orderCount > 0 ? 'Registradas en el filtro' : 'Sin pedidos',
      icon: <ShoppingCartOutlined style={{ fontSize: 22, color: '#3b82f6' }} />,
      iconBg: '#eff6ff',
      borderColor: '#bfdbfe',
      tooltip: 'Cantidad de órdenes encontradas con los filtros activos.',
      tag: null,
    },
    {
      title: 'Pago Wompi (Online)',
      value: formatCurrency(stats.wompiTotal),
      subtext: `${stats.wompiCount} ${stats.wompiCount === 1 ? 'pedido' : 'pedidos'} (${stats.orderCount > 0 ? Math.round((stats.wompiCount / stats.orderCount) * 100) : 0}%)`,
      icon: <CreditCardOutlined style={{ fontSize: 22, color: '#0284c7' }} />,
      iconBg: '#f0f9ff',
      borderColor: '#bae6fd',
      tooltip: 'Órdenes pagadas o generadas a través de la pasarela Wompi (Nequi, PSE, Tarjeta).',
      tag: <Tag color="blue" style={{ margin: 0, fontSize: 11, borderRadius: 6 }}>Wompi</Tag>,
    },
    {
      title: 'Contraentrega (Destino)',
      value: formatCurrency(stats.contraentregaTotal),
      subtext: `${stats.contraentregaCount} ${stats.contraentregaCount === 1 ? 'pedido' : 'pedidos'} (${stats.orderCount > 0 ? Math.round((stats.contraentregaCount / stats.orderCount) * 100) : 0}%)`,
      icon: <CarOutlined style={{ fontSize: 22, color: '#f59e0b' }} />,
      iconBg: '#fffbeb',
      borderColor: '#fde68a',
      tooltip: 'Órdenes con pago en efectivo / contraentrega al recibir el producto.',
      tag: <Tag color="orange" style={{ margin: 0, fontSize: 11, borderRadius: 6 }}>Al recibir</Tag>,
    },
  ];

  return (
    <Spin spinning={loading} size="small">
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {cards.map((item, i) => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <motion.div custom={i} initial="hidden" animate="visible" variants={fadeIn}>
              <Card
                bordered
                size="small"
                style={{
                  borderRadius: 12,
                  borderColor: '#e2e8f0',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  background: '#ffffff',
                  height: '100%',
                }}
                styles={{ body: { padding: '14px 16px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                      {item.title}
                    </span>
                    <Tooltip title={item.tooltip}>
                      <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 12, cursor: 'pointer' }} />
                    </Tooltip>
                  </div>

                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: item.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${item.borderColor}`,
                    }}
                  >
                    {item.icon}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#0f172a',
                      letterSpacing: '-0.5px',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.value}
                  </span>
                  {item.tag}
                </div>

                <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                  {item.subtext}
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>
    </Spin>
  );
};

export default OrdersStats;

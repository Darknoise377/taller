'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Spin, Tooltip } from 'antd';
import {
  DollarCircleOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { motion, easeOut } from 'framer-motion';


// Tipado
type OrdersStatsProps = {
  stats: {
    totalGeneral: number;
    orderCount: number;
    avgTicket: number;
  };
  loading: boolean;
};

// 💎 Animación personalizada
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: easeOut },
  }),
};

const OrdersStats: React.FC<OrdersStatsProps> = ({ stats, loading }) => {
  const cardData = [
    {
      title: 'Ingresos Totales (Filtro)',
      value: stats.totalGeneral,
      color: '#3f8600',
      icon: <DollarCircleOutlined style={{ color: '#3f8600' }} />,
      gradient: 'linear-gradient(135deg, #b6f492 0%, #338b4d 100%)',
      tooltip: 'Suma total de ingresos del período filtrado.',
      prefix: '$',
    },
    {
      title: 'Órdenes (Filtro)',
      value: stats.orderCount,
      color: '#1890ff',
      icon: <ShoppingCartOutlined style={{ color: '#1890ff' }} />,
      gradient: 'linear-gradient(135deg, #b1d4ff 0%, #1d70e8 100%)',
      tooltip: 'Cantidad total de órdenes registradas en el filtro.',
    },
    {
      title: 'Ticket Promedio (Filtro)',
      value: stats.avgTicket,
      color: '#faad14',
      icon: <BarChartOutlined style={{ color: '#faad14' }} />,
      gradient: 'linear-gradient(135deg, #ffeaa7 0%, #e1b12c 100%)',
      tooltip: 'Promedio del valor por cada orden durante el filtro.',
      prefix: '$',
    },
  ];

  return (
    <Spin spinning={loading} tip="Cargando estadísticas..." size="large">
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {cardData.map((item, i) => (
          <Col xs={24} sm={12} md={8} key={i}>
            <motion.div
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <Card
                bordered={false}
                style={{
                  background: item.gradient,
                  borderRadius: 16,
                  boxShadow:
                    '0 4px 20px rgba(0, 0, 0, 0.1), inset 0 0 8px rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                }}
                bodyStyle={{ padding: '1.5rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Statistic
                    title={
                      <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {item.title}{' '}
                        <Tooltip title={item.tooltip}>
                          <InfoCircleOutlined style={{ marginLeft: 6 }} />
                        </Tooltip>
                      </span>
                    }
                    value={item.value}
                    precision={0}
                    groupSeparator="."
                    valueStyle={{
                      color: '#fff',
                      fontWeight: 700,
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                    prefix={item.prefix ? `${item.prefix}` : ''}
                  />
                  <div
                    style={{
                      fontSize: 36,
                      opacity: 0.9,
                      marginTop: 8,
                    }}
                  >
                    {item.icon}
                  </div>
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

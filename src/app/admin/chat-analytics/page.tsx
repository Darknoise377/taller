'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Select,
  Space,
  Typography,
  Progress,
  Collapse,
  Badge,
  Spin,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text } = Typography;

type Stats = {
  total: number;
  converted: number;
  inProgress: number;
  abandoned: number;
  conversionRate: number;
};

type AbandonCause = { cause: string; count: number };

type SessionSummary = {
  id: number;
  phone: string;
  messageCount: number;
  lastActivity: string;
  hoursSinceLastMsg: number;
  possibleCause: string;
  lastMessages: Array<{ role: string; content: string; createdAt: string }>;
};

type AnalyticsData = {
  stats: Stats;
  abandonCauses: AbandonCause[];
  abandonedSessions: SessionSummary[];
};

const CAUSE_COLORS: Record<string, string> = {
  'Producto sin stock': 'red',
  'Error técnico del asistente': 'volcano',
  'Consulta fuera de tema': 'orange',
  'Abandonó al pedir datos del pedido': 'gold',
  'Consultó precio pero no compró': 'blue',
  'Consultó producto pero no compró': 'geekblue',
  'Abandonó en saludo inicial': 'gray',
  'Razón no identificada': 'default',
};

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

export default function ChatAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/chat-analytics?days=${days}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: ColumnsType<SessionSummary> = [
    {
      title: 'Teléfono',
      dataIndex: 'phone',
      key: 'phone',
      render: (p) => <Text code>{maskPhone(p)}</Text>,
      width: 140,
    },
    {
      title: 'Mensajes',
      dataIndex: 'messageCount',
      key: 'messageCount',
      sorter: (a, b) => a.messageCount - b.messageCount,
      render: (n) => <Badge count={n} color="blue" overflowCount={999} />,
      width: 90,
    },
    {
      title: 'Última actividad',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      sorter: (a, b) => a.hoursSinceLastMsg - b.hoursSinceLastMsg,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(r.lastActivity).fromNow()}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(r.lastActivity).format('DD/MM/YY HH:mm')}
          </Text>
        </Space>
      ),
      width: 140,
    },
    {
      title: 'Posible causa de abandono',
      dataIndex: 'possibleCause',
      key: 'possibleCause',
      filters: Object.keys(CAUSE_COLORS).map((k) => ({ text: k, value: k })),
      onFilter: (value, record) => record.possibleCause === value,
      render: (cause) => (
        <Tag color={CAUSE_COLORS[cause] ?? 'default'}>{cause}</Tag>
      ),
    },
    {
      title: 'Últimos mensajes',
      key: 'preview',
      render: (_, record) => (
        <Collapse
          size="small"
          ghost
          items={[{
            key: '1',
            label: <Text type="secondary" style={{ fontSize: 12 }}>Ver conversación</Text>,
            children: (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {record.lastMessages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 6,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: m.role === 'user' ? '#f0f5ff' : '#f6ffed',
                      borderLeft: `3px solid ${m.role === 'user' ? '#597ef7' : '#52c41a'}`,
                    }}
                  >
                    <Text strong style={{ fontSize: 11, textTransform: 'capitalize' }}>
                      {m.role === 'user' ? '👤 Cliente' : '🤖 Asistente'}
                    </Text>
                    <br />
                    <Text style={{ fontSize: 12 }}>{m.content}</Text>
                  </div>
                ))}
              </div>
            ),
          }]}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 20 }} align="center">
        <Title level={4} style={{ margin: 0 }}>
          📊 Analytics de conversaciones WhatsApp
        </Title>
        <Select
          value={days}
          onChange={setDays}
          options={[
            { label: 'Últimos 7 días', value: 7 },
            { label: 'Últimos 30 días', value: 30 },
            { label: 'Últimos 90 días', value: 90 },
          ]}
          style={{ width: 160 }}
        />
      </Space>

      {loading && !data ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <Spin size="large" />
        </div>
      ) : !data ? null : (
        <>
          {/* ── Métricas principales ── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="Total conversaciones"
                  value={data.stats.total}
                  prefix={<MessageOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="Ventas generadas"
                  value={data.stats.converted}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="Abandonos"
                  value={data.stats.abandoned}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card>
                <Statistic
                  title="En progreso"
                  value={data.stats.inProgress}
                  valueStyle={{ color: '#1677ff' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* ── Tasa de conversión ── */}
          <Card style={{ marginBottom: 24 }}>
            <Space>
              <RiseOutlined style={{ fontSize: 18, color: '#1677ff' }} />
              <Text strong>Tasa de conversión:</Text>
              <Text style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>
                {data.stats.conversionRate}%
              </Text>
            </Space>
            <Progress
              percent={data.stats.conversionRate}
              strokeColor={{ '0%': '#1677ff', '100%': '#52c41a' }}
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* ── Causas de abandono ── */}
          {data.abandonCauses.length > 0 && (
            <Card
              title="Causas de no-venta detectadas"
              style={{ marginBottom: 24 }}
            >
              <Row gutter={[12, 12]}>
                {data.abandonCauses.map(({ cause, count }) => (
                  <Col key={cause}>
                    <Tag
                      color={CAUSE_COLORS[cause] ?? 'default'}
                      style={{ fontSize: 13, padding: '4px 10px' }}
                    >
                      {cause}: <strong>{count}</strong>
                    </Tag>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* ── Tabla de abandonos ── */}
          <Card title="Conversaciones abandonadas (con engagement)">
            {data.abandonedSessions.length === 0 ? (
              <Empty description="Sin abandonos significativos en este período" />
            ) : (
              <Table
                dataSource={data.abandonedSessions}
                columns={columns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 20 }}
                loading={loading}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

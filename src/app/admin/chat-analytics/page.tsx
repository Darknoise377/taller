'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Badge,
  Spin,
  Empty,
  Tabs,
  Modal,
  Button,
  Input,
  Alert,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  RiseOutlined,
  RobotOutlined,
  WhatsAppOutlined,
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  AlertOutlined,
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

type ChatMsg = {
  id?: number;
  role: string;
  content: string;
  createdAt: string;
};

type SessionSummary = {
  id: number;
  phone: string;
  userId: string | null;
  source: 'whatsapp' | 'meta_messenger' | 'web_assistant' | 'unknown';
  status: 'converted' | 'in_progress' | 'abandoned';
  messageCount: number;
  lastActivity: string;
  hoursSinceLastMsg: number;
  possibleCause: string;
  lastMessages: ChatMsg[];
  allMessages?: ChatMsg[];
};

type SystemHealth = {
  ai: {
    configured: boolean;
    provider: 'vertex' | 'gemini' | 'openai' | 'none';
    model: string;
    details: string;
  };
  whatsapp: {
    configured: boolean;
    phoneId: string | null;
    apiVersion: string;
    hasSecret: boolean;
    hasToken: boolean;
  };
};

type AnalyticsData = {
  stats: Stats;
  systemHealth?: SystemHealth;
  abandonCauses: AbandonCause[];
  sessions?: SessionSummary[];
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
  'Venta / Pedido completado': 'green',
  'En curso (activa recientemente)': 'cyan',
  'Razón no identificada': 'default',
};

const SOURCE_META: Record<SessionSummary['source'], { label: string; color: string; icon: React.ReactNode }> = {
  whatsapp: { label: 'WhatsApp Bot', color: 'green', icon: <WhatsAppOutlined /> },
  meta_messenger: { label: 'Messenger', color: 'blue', icon: <MessageOutlined /> },
  web_assistant: { label: 'Mecha (Web)', color: 'purple', icon: <RobotOutlined /> },
  unknown: { label: 'Sin clasificar', color: 'default', icon: <MessageOutlined /> },
};

function maskPhone(phone: string) {
  if (!phone) return 'Anónimo';
  if (phone.startsWith('ip:')) return `Web (${phone.replace('ip:', '')})`;
  if (phone.length < 7) return phone;
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

export default function ChatAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'abandoned' | 'converted'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/chat-analytics?days=${days}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Error fetching chat analytics:', e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combined sessions list: prefer all sessions from API, fallback to abandonedSessions
  const allSessionsList = useMemo(() => {
    return data?.sessions ?? data?.abandonedSessions ?? [];
  }, [data]);

  // Filtered by tab, channel, and search
  const filteredSessions = useMemo(() => {
    return allSessionsList.filter((s) => {
      // Tab filter
      if (activeTab === 'in_progress' && s.status !== 'in_progress') return false;
      if (activeTab === 'abandoned' && s.status !== 'abandoned') return false;
      if (activeTab === 'converted' && s.status !== 'converted') return false;

      // Channel filter
      if (channelFilter !== 'all' && s.source !== channelFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchPhone = s.phone.toLowerCase().includes(query);
        const matchCause = s.possibleCause.toLowerCase().includes(query);
        const matchMessages = (s.allMessages ?? s.lastMessages ?? []).some((m) =>
          m.content.toLowerCase().includes(query)
        );
        if (!matchPhone && !matchCause && !matchMessages) return false;
      }

      return true;
    });
  }, [allSessionsList, activeTab, channelFilter, searchTerm]);

  const openConversationModal = (session: SessionSummary) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const columns: ColumnsType<SessionSummary> = [
    {
      title: 'Cliente / Contacto',
      dataIndex: 'phone',
      key: 'phone',
      render: (p: string, r) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: 13 }}>
            {maskPhone(p)}
          </Text>
          <Text  type="secondary" style={{ fontSize: 11 }}>
            ID sesión: #{r.id}
          </Text>
        </Space>
      ),
      width: 170,
    },
    {
      title: 'Canal',
      dataIndex: 'source',
      key: 'source',
      render: (source: SessionSummary['source']) => {
        const meta = SOURCE_META[source] ?? SOURCE_META.unknown;
        return (
          <Tag color={meta.color} icon={meta.icon}>
            {meta.label}
          </Tag>
        );
      },
      width: 140,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: SessionSummary['status']) => {
        if (status === 'converted') {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Concretado</Tag>;
        }
        if (status === 'in_progress') {
          return <Tag color="blue" icon={<ClockCircleOutlined />}>En curso</Tag>;
        }
        return <Tag color="orange" icon={<CloseCircleOutlined />}>Abandonado</Tag>;
      },
      width: 125,
    },
    {
      title: 'Mensajes',
      dataIndex: 'messageCount',
      key: 'messageCount',
      sorter: (a, b) => a.messageCount - b.messageCount,
      render: (n) => <Badge count={n} color="blue" overflowCount={999} />,
      width: 95,
      align: 'center',
    },
    {
      title: 'Diagnóstico / Causa',
      dataIndex: 'possibleCause',
      key: 'possibleCause',
      render: (cause) => (
        <Tag color={CAUSE_COLORS[cause] ?? 'default'} style={{ maxWidth: 220, whiteSpace: 'normal' }}>
          {cause}
        </Tag>
      ),
    },
    {
      title: 'Última actividad',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      sorter: (a, b) => new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime(),
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
      title: 'Acción',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => openConversationModal(record)}
        >
          Ver chat
        </Button>
      ),
      width: 110,
      align: 'center',
    },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Encabezado principal ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            💬 Asistente IA & WhatsApp Bot (Mecha)
          </Title>
          <Text type="secondary">
            Monitoreo en tiempo real de conversaciones, atención al cliente y pedidos automatizados.
          </Text>
        </div>
        <Space>
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
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Actualizar
          </Button>
        </Space>
      </div>

      {/* ── Diagnóstico de Salud del Sistema ── */}
      {data?.systemHealth && (
        <Card
          size="small"
          style={{ marginBottom: 24, borderRadius: 10, borderColor: '#d9d9d9' }}
        >
          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} md={12}>
              <Space align="start">
                <RobotOutlined style={{ fontSize: 22, color: data.systemHealth.ai.configured ? '#52c41a' : '#faad14', marginTop: 2 }} />
                <div>
                  <Text strong>Motor de IA (Mecha): </Text>
                  {data.systemHealth.ai.configured ? (
                    <Tag color="success">
                      {data.systemHealth.ai.provider.toUpperCase()} · {data.systemHealth.ai.model}
                    </Tag>
                  ) : (
                    <Tag color="error">NO CONFIGURADO</Tag>
                  )}
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    {data.systemHealth.ai.details}
                  </div>
                </div>
              </Space>
            </Col>

            <Col xs={24} md={12}>
              <Space align="start">
                <WhatsAppOutlined style={{ fontSize: 22, color: data.systemHealth.whatsapp.configured ? '#52c41a' : '#faad14', marginTop: 2 }} />
                <div>
                  <Text strong>WhatsApp Cloud API: </Text>
                  {data.systemHealth.whatsapp.configured ? (
                    <Tag color="success">ACTIVO ({data.systemHealth.whatsapp.apiVersion})</Tag>
                  ) : (
                    <Tag color="warning">CONFIGURACIÓN INCOMPLETA</Tag>
                  )}
                  {data.systemHealth.whatsapp.hasSecret ? (
                    <Tooltip title="Firma HMAC-SHA256 validada en webhook">
                      <Tag color="blue">Webhook Protegido</Tag>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Recomendado configurar WHATSAPP_APP_SECRET para mayor seguridad">
                      <Tag color="default">Sin App Secret</Tag>
                    </Tooltip>
                  )}
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    Phone ID: {data.systemHealth.whatsapp.phoneId ? `...${data.systemHealth.whatsapp.phoneId.slice(-6)}` : 'No asignado'}
                  </div>
                </div>
              </Space>
            </Col>
          </Row>

          {!data.systemHealth.ai.configured && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              icon={<AlertOutlined />}
              message="Configura la clave de IA en Vercel"
              description="Para que Mecha y el bot de WhatsApp puedan responder automáticamente a los clientes, ingresa a tu proyecto en Vercel > Settings > Environment Variables y agrega GEMINI_API_KEY (de Google AI Studio) o VERTEX_SA_JSON_BASE64."
            />
          )}

          {!data.systemHealth.whatsapp.configured && (
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              message="Configuración de WhatsApp Business API"
              description="Para activar respuestas en WhatsApp, asegúrate de tener configuradas las variables WHATSAPP_API_TOKEN y WHATSAPP_PHONE_ID en Vercel."
            />
          )}
        </Card>
      )}

      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 12, color: '#888' }}>Cargando analítica de conversaciones...</p>
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
                  title="En progreso"
                  value={data.stats.inProgress}
                  valueStyle={{ color: '#1677ff' }}
                  prefix={<ClockCircleOutlined />}
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
          </Row>

          {/* ── Tasa de conversión y Causas ── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} md={10}>
              <Card title="Efectividad del Asistente (Conversión)">
                <Space  size={12}>
                  <RiseOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                  <div>
                    <Text type="secondary">Tasa de conversión a pedido:</Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>
                      {data.stats.conversionRate}%
                    </div>
                  </div>
                </Space>
                <Progress
                  percent={data.stats.conversionRate}
                  strokeColor={{ '0%': '#1677ff', '100%': '#52c41a' }}
                  style={{ marginTop: 12 }}
                />
              </Card>
            </Col>

            <Col xs={24} md={14}>
              <Card title="Causas frecuentes de abandono detectadas">
                {data.abandonCauses.length === 0 ? (
                  <Text type="secondary">No se han registrado motivos de abandono en este rango.</Text>
                ) : (
                  <Space wrap size={[8, 8]}>
                    {data.abandonCauses.map(({ cause, count }) => (
                      <Tag
                        key={cause}
                        color={CAUSE_COLORS[cause] ?? 'default'}
                        style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}
                      >
                        {cause}: <strong>{count}</strong>
                      </Tag>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>
          </Row>

          {/* ── Explorador de Conversaciones ── */}
          <Card
            title="Historial de Conversaciones del Asistente"
            extra={
              <Space wrap>
                <Select
                  value={channelFilter}
                  onChange={setChannelFilter}
                  options={[
                    { label: 'Todos los canales', value: 'all' },
                    { label: 'WhatsApp Bot', value: 'whatsapp' },
                    { label: 'Mecha (Web)', value: 'web_assistant' },
                    { label: 'Messenger', value: 'meta_messenger' },
                  ]}
                  style={{ width: 170 }}
                />
                <Input
                  placeholder="Buscar teléfono o texto..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: 220 }}
                  allowClear
                />
              </Space>
            }
          >
            <Tabs
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as typeof activeTab)}
              items={[
                {
                  key: 'all',
                  label: `Todas (${allSessionsList.length})`,
                },
                {
                  key: 'in_progress',
                  label: `En curso (${data.stats.inProgress})`,
                },
                {
                  key: 'abandoned',
                  label: `Abandonadas (${data.stats.abandoned})`,
                },
                {
                  key: 'converted',
                  label: `Ventas (${data.stats.converted})`,
                },
              ]}
              style={{ marginBottom: 16 }}
            />

            {filteredSessions.length === 0 ? (
              <Empty
                description={
                  searchTerm
                    ? 'No se encontraron conversaciones con ese criterio de búsqueda'
                    : 'Sin conversaciones registradas en este período'
                }
              />
            ) : (
              <Table
                dataSource={filteredSessions}
                columns={columns}
                rowKey="id"
                size="middle"
                pagination={{ pageSize: 15, showTotal: (t) => `Total: ${t} conversaciones` }}
                loading={loading}
              />
            )}
          </Card>
        </>
      )}

      {/* ── Modal para ver la conversación completa en formato chat ── */}
      <Modal
        title={
          <Space>
            <MessageOutlined />
            <span>Conversación #{selectedSession?.id} · {selectedSession ? maskPhone(selectedSession.phone) : ''}</span>
            {selectedSession && (
              <Tag color={SOURCE_META[selectedSession.source]?.color}>
                {SOURCE_META[selectedSession.source]?.label}
              </Tag>
            )}
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Cerrar
          </Button>,
        ]}
        width={680}
      >
        {selectedSession && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8 }}>
              <Row  justify="space-between">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Estado: <strong>{selectedSession.status.toUpperCase()}</strong> ({selectedSession.possibleCause})
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Total mensajes: {selectedSession.messageCount}
                </Text>
              </Row>
            </div>

            <div
              style={{
                maxHeight: 460,
                overflowY: 'auto',
                padding: '12px 14px',
                background: '#fafafa',
                borderRadius: 10,
                border: '1px solid #e8e8e8',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {(selectedSession.allMessages ?? selectedSession.lastMessages ?? []).length === 0 ? (
                <Empty description="No hay mensajes guardados en esta sesión" />
              ) : (
                (selectedSession.allMessages ?? selectedSession.lastMessages ?? []).map((msg, i) => {
                  const isUser = msg.role === 'user';
                  const isProfile = msg.role === 'profile';
                  return (
                    <div
                      key={msg.id ?? i}
                      style={{
                        alignSelf: isProfile ? 'center' : isUser ? 'flex-end' : 'flex-start',
                        maxWidth: isProfile ? '95%' : '80%',
                        background: isProfile ? '#fffbe6' : isUser ? '#0A2A66' : '#ffffff',
                        color: isUser ? '#ffffff' : '#333333',
                        padding: '8px 14px',
                        borderRadius: 14,
                        border: isProfile ? '1px dashed #ffe58f' : isUser ? 'none' : '1px solid #e8e8e8',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          marginBottom: 4,
                          color: isUser ? '#93c5fd' : isProfile ? '#d48806' : '#0A2A66',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 16,
                        }}
                      >
                        <span>
                          {isProfile ? '📦 Datos de Pedido Concretado' : isUser ? '👤 Cliente' : '🤖 Asistente (Mecha)'}
                        </span>
                        <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 400 }}>
                          {dayjs(msg.createdAt).format('HH:mm')}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

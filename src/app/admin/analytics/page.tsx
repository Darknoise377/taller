'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  Spin,
  Empty,
  Button,
  Progress,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text } = Typography;

// --- Tipos ---
type TopSearch = { query: string; count: number };
type TopPage = { path: string; label: string | null; count: number };
type RecentSearch = { id: number; query: string; results: number; createdAt: string };
type TrafficPoint = { date: string; visitors: number; searches: number };

type AnalyticsData = {
  topSearches: TopSearch[];
  topPages: TopPage[];
  recentSearches: RecentSearch[];
  traffic: {
    daily: TrafficPoint[];
    weekly: TrafficPoint[];
    monthly: TrafficPoint[];
  };
  summary: {
    totalSearches: number;
    totalPageViews: number;
    uniqueVisitors: number;
    searchesNoResults: number;
    topSearchTerm: string | null;
    trendSearches: number;
    trendVisitors: number;
    todaySearches: number;
    todayVisitors: number;
  };
};

// --- Columnas ---
const topSearchCols: ColumnsType<TopSearch> = [
  {
    title: '#',
    key: 'rank',
    render: (_v, _r, i) => (
      <Text strong className={i < 3 ? 'text-blue-600' : ''}>
        {i + 1}
      </Text>
    ),
    width: 48,
  },
  {
    title: 'Término',
    dataIndex: 'query',
    key: 'query',
    render: (q: string) => (
      <span className="capitalize font-medium">{q}</span>
    ),
  },
  {
    title: 'Búsquedas',
    dataIndex: 'count',
    key: 'count',
    align: 'right',
    render: (c: number) => (
      <Tag color="blue" className="font-semibold">{c}</Tag>
    ),
  },
];

const topPageCols: ColumnsType<TopPage> = [
  {
    title: '#',
    key: 'rank',
    render: (_v, _r, i) => (
      <Text strong className={i < 3 ? 'text-green-600' : ''}>
        {i + 1}
      </Text>
    ),
    width: 48,
  },
  {
    title: 'Producto / Sección',
    key: 'label',
    render: (_v, r) => (
      <div>
        <span className="font-medium block">{r.label ?? r.path}</span>
        <Text type="secondary" className="text-xs">{r.path}</Text>
      </div>
    ),
  },
  {
    title: 'Visitas',
    dataIndex: 'count',
    key: 'count',
    align: 'right',
    render: (c: number) => (
      <Tag color="geekblue" className="font-semibold">{c}</Tag>
    ),
  },
];

const recentSearchCols: ColumnsType<RecentSearch> = [
  {
    title: 'Término',
    dataIndex: 'query',
    key: 'query',
    render: (q: string) => <span className="capitalize">{q}</span>,
  },
  {
    title: 'Resultados',
    dataIndex: 'results',
    key: 'results',
    align: 'center',
    render: (r: number) => (
      <Tag color={r > 0 ? 'success' : 'error'}>
        {r > 0 ? `${r} resultados` : 'Sin resultados'}
      </Tag>
    ),
  },
  {
    title: 'Fecha',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (d: string) => (
      <Text type="secondary" className="text-xs">{dayjs(d).fromNow()}</Text>
    ),
  },
];

// --- Componente KPI Card ---
interface KPICardProps {
  title: string;
  value: number;
  trend?: number;
  icon: React.ReactNode;
  color?: string;
  suffix?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, icon, color = '#1890ff', suffix }) => {
  const trendColor = trend !== undefined ? (trend > 0 ? '#52c41a' : trend < 0 ? '#ff4d4f' : '#8c8c8c') : undefined;
  const TrendIcon = trend !== undefined && trend !== 0 ? (trend > 0 ? RiseOutlined : FallOutlined) : null;

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <Statistic
        title={<span className="text-gray-600 text-sm">{title}</span>}
        value={value}
        prefix={<span className="text-lg mr-2">{icon}</span>}
        suffix={suffix}
        valueStyle={{ color, fontSize: 24, fontWeight: 600 }}
      />
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {TrendIcon && <TrendIcon style={{ color: trendColor }} />}
          <Text type="secondary" style={{ color: trendColor }}>
            {trend > 0 ? '+' : ''}{trend}% vs período anterior
          </Text>
        </div>
      )}
    </Card>
  );
};

// --- Gráfico de tráfico ---
const TrafficChart: React.FC<{ data: TrafficPoint[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="date" stroke="#888" fontSize={12} />
      <YAxis stroke="#888" fontSize={12} />
      <Tooltip 
        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter={(value: any) => [`${value}`, 'Visitantes/Búsquedas']}
      />
      <Line type="monotone" dataKey="visitors" stroke="#1890ff" strokeWidth={2} dot={{ r: 3 }} name="visitantes" />
      <Line type="monotone" dataKey="searches" stroke="#52c41a" strokeWidth={2} dot={{ r: 3 }} name="búsquedas" />
    </LineChart>
  </ResponsiveContainer>
);

// --- Componente principal ---
export default function StoreAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/stats');
      if (!res.ok) throw new Error('Error al cargar analytics');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96 bg-gray-50">
        <Spin size="large" tip="Cargando dashboard..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <Empty description={error ?? 'No hay datos disponibles'}>
          <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
            Reintentar
          </Button>
        </Empty>
      </div>
    );
  }

  const { summary } = data;
  const noResultsRate = summary.totalSearches > 0 
    ? (summary.searchesNoResults / summary.totalSearches) * 100 
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1">
            📊 Analytics de la Tienda
          </Title>
          <Text type="secondary">Métricas de tráfico, búsquedas y comportamiento de usuarios</Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          Actualizar
        </Button>
      </div>

      {/* KPIs principales */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Visitantes Únicos (30d)"
            value={summary.uniqueVisitors}
            trend={summary.trendVisitors}
            icon={<UserOutlined />}
            color="#1890ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Búsquedas Totales (30d)"
            value={summary.totalSearches}
            trend={summary.trendSearches}
            icon={<SearchOutlined />}
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Visitas a Productos (30d)"
            value={summary.totalPageViews}
            icon={<EyeOutlined />}
            color="#faad14"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <div className="flex flex-col">
              <Text className="text-gray-600 text-sm mb-2">Tasa de Búsquedas Vacías</Text>
              <Progress
                percent={Math.round(noResultsRate)}
                strokeColor={noResultsRate > 20 ? '#ff4d4f' : noResultsRate > 10 ? '#faad14' : '#52c41a'}
                format={() => `${summary.searchesNoResults} / ${summary.totalSearches}`}
              />
              <Text type="secondary" className="text-xs mt-1">
                {noResultsRate > 20 
                  ? '⚠️ Alto índice' 
                  : noResultsRate > 10 
                    ? '🔍 Considerar agregar productos' 
                    : '✅ Búsquedas efectivas'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* KPIs del día */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="bg-blue-50 border-blue-200">
            <Statistic
              title={<span className="text-blue-600">Hoy - Visitantes</span>}
              value={summary.todayVisitors}
              prefix={<UserOutlined className="text-blue-500" />}
              valueStyle={{ fontSize: 20, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="bg-green-50 border-green-200">
            <Statistic
              title={<span className="text-green-600">Hoy - Búsquedas</span>}
              value={summary.todaySearches}
              prefix={<SearchOutlined className="text-green-500" />}
              valueStyle={{ fontSize: 20, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className="bg-purple-50 border-purple-200">
            <Statistic
              title={<span className="text-purple-600">Término Principal</span>}
              value={summary.topSearchTerm || 'N/A'}
              prefix={<BarChartOutlined className="text-purple-500" />}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Tráfico Diario (7 días)" size="small">
            {data.traffic.daily.length > 0 ? (
              <TrafficChart data={data.traffic.daily} />
            ) : (
              <Empty description="Sin datos de tráfico" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Tráfico Semanal (4 semanas)" size="small">
            {data.traffic.weekly.length > 0 ? (
              <TrafficChart data={data.traffic.weekly} />
            ) : (
              <Empty description="Sin datos de tráfico" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Tráfico Mensual (6 meses)" size="small">
            {data.traffic.monthly.length > 0 ? (
              <TrafficChart data={data.traffic.monthly} />
            ) : (
              <Empty description="Sin datos de tráfico" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Distribución de Búsquedas" size="small">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topSearches.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="query" stroke="#888" fontSize={10} tick={{ transform: 'rotate(-45)' }} />
<YAxis stroke="#888" fontSize={12} />
                <Tooltip formatter={/* eslint-disable-next-line @typescript-eslint/no-explicit-any */ (_: any) => [`${_} búsquedas`, 'Total']} />
                <Bar dataKey="count" fill="#1890ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Top búsquedas y páginas */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={<><SearchOutlined className="mr-1" /> Top 20 Búsquedas (30d)</>}
            size="small"
          >
            {data.topSearches.length === 0 ? (
              <Empty description="Sin datos" />
            ) : (
              <Table
                dataSource={data.topSearches}
                columns={topSearchCols}
                rowKey="query"
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<><EyeOutlined className="mr-1" /> Top 20 Productos/Secciones (30d)</>}
            size="small"
          >
            {data.topPages.length === 0 ? (
              <Empty description="Sin datos" />
            ) : (
              <Table
                dataSource={data.topPages}
                columns={topPageCols}
                rowKey="path"
                pagination={{ pageSize: 10, size: 'small' }}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Últimas búsquedas */}
      <Card
        title={<><ClockCircleOutlined className="mr-1" /> Últimas 50 Búsquedas</>}
        size="small"
      >
        {data.recentSearches.length === 0 ? (
          <Empty description="Sin búsquedas recientes" />
        ) : (
          <Table
            dataSource={data.recentSearches}
            columns={recentSearchCols}
            rowKey="id"
            pagination={{ pageSize: 20, size: 'small' }}
            size="small"
          />
        )}
      </Card>

      {/* Alerta de búsquedas sin resultados */}
      {noResultsRate > 15 && (
        <Card size="small" className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2">
            <ExclamationCircleOutlined className="text-amber-500 text-lg mt-0.5" />
            <div>
              <Text strong className="text-amber-700">Oportunidad de crecimiento detectada</Text>
              <Text className="block text-amber-600 mt-1">
                El {Math.round(noResultsRate)}% de las búsquedas no tienen resultados. 
                Esto indica productos que los usuarios buscan pero no tienen disponibles. 
                Considerar agregarlos al catálogo.
              </Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
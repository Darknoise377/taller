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
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text } = Typography;

type TopSearch = { query: string; count: number };
type TopPage  = { path: string; label: string | null; count: number };
type RecentSearch = { id: number; query: string; results: number; createdAt: string };

type AnalyticsData = {
  topSearches: TopSearch[];
  topPages: TopPage[];
  recentSearches: RecentSearch[];
};

const topSearchCols: ColumnsType<TopSearch> = [
  {
    title: '#',
    key: 'rank',
    render: (_v, _r, i) => (
      <Text strong style={{ color: i < 3 ? '#0038A8' : undefined }}>
        {i + 1}
      </Text>
    ),
    width: 48,
  },
  {
    title: 'Búsqueda',
    dataIndex: 'query',
    key: 'query',
    render: (q: string) => (
      <span className="capitalize font-medium">{q}</span>
    ),
  },
  {
    title: 'Veces buscado',
    dataIndex: 'count',
    key: 'count',
    align: 'right',
    render: (c: number) => <Tag color="blue">{c}</Tag>,
  },
];

const topPageCols: ColumnsType<TopPage> = [
  {
    title: '#',
    key: 'rank',
    render: (_v, _r, i) => (
      <Text strong style={{ color: i < 3 ? '#0038A8' : undefined }}>
        {i + 1}
      </Text>
    ),
    width: 48,
  },
  {
    title: 'Producto / Sección',
    key: 'label',
    render: (_v, r) => (
      <span>
        <span className="font-medium">{r.label ?? r.path}</span>
        <br />
        <Text type="secondary" style={{ fontSize: 11 }}>{r.path}</Text>
      </span>
    ),
  },
  {
    title: 'Visitas',
    dataIndex: 'count',
    key: 'count',
    align: 'right',
    render: (c: number) => <Tag color="geekblue">{c}</Tag>,
  },
];

const recentSearchCols: ColumnsType<RecentSearch> = [
  {
    title: 'Búsqueda',
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
      <Tag color={r > 0 ? 'green' : 'red'}>{r > 0 ? r : 'Sin resultados'}</Tag>
    ),
  },
  {
    title: 'Hace',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (d: string) => dayjs(d).fromNow(),
  },
];

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
      <div className="flex justify-center items-center min-h-64">
        <Spin size="large" tip="Cargando analytics..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Empty description={error ?? 'No hay datos'} />
        <div className="text-center mt-4">
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const totalSearches = data.topSearches.reduce((s, r) => s + r.count, 0);
  const totalViews    = data.topPages.reduce((s, r) => s + r.count, 0);
  const noResultsSearches = data.recentSearches.filter((s) => s.results === 0).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Title level={3} style={{ margin: 0 }}>
          📊 Analytics de la Tienda
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          loading={loading}
        >
          Actualizar
        </Button>
      </div>

      {/* Estadísticas resumen */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Búsquedas (últimos 30 días)"
              value={totalSearches}
              prefix={<SearchOutlined />}
              valueStyle={{ color: '#0038A8' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Visitas a productos (30 días)"
              value={totalViews}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#006A3C' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Búsquedas sin resultados"
              value={noResultsSearches}
              prefix={<SearchOutlined />}
              valueStyle={{ color: noResultsSearches > 0 ? '#CE1126' : '#52c41a' }}
              suffix={`/ ${data.recentSearches.length}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Top búsquedas + top páginas */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={<><SearchOutlined className="mr-2" />Top búsquedas (30 días)</>}
            size="small"
          >
            {data.topSearches.length === 0 ? (
              <Empty description="Aún no hay búsquedas registradas" />
            ) : (
              <Table
                dataSource={data.topSearches}
                columns={topSearchCols}
                rowKey="query"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<><EyeOutlined className="mr-2" />Productos más visitados (30 días)</>}
            size="small"
          >
            {data.topPages.length === 0 ? (
              <Empty description="Aún no hay visitas registradas" />
            ) : (
              <Table
                dataSource={data.topPages}
                columns={topPageCols}
                rowKey="path"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Últimas búsquedas */}
      <Card
        title={<><SearchOutlined className="mr-2" />Últimas 50 búsquedas</>}
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
    </div>
  );
}

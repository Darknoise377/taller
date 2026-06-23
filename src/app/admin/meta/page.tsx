'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Button, Card, Divider, Form, Input, message, Popconfirm, Spin, Table, Tag, Typography, Select,
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, DisconnectOutlined, ReloadOutlined,
  SendOutlined, PictureOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;

interface MetaStatus {
  connected: boolean;
  pageId?: string;
  hasInstagram?: boolean;
  expiresAt?: string;
}

interface Product {
  id: string;
  name: string;
  imageUrl?: string;
  price: number;
}

interface SocialPostRow {
  id: string;
  platform: string;
  status: string;
  metaPostId?: string;
  caption: string;
  createdAt: string;
}

export default function AdminMetaPage() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [form] = Form.useForm<{ productId: string; caption: string; platform: string }>();

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/status?storeId=default');
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/posts?storeId=default');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStatus(), loadProducts(), loadPosts()])
      .finally(() => setLoading(false));
  }, [loadStatus, loadProducts, loadPosts]);

  const handleConnect = () => {
    window.location.href = '/api/meta/oauth/login?storeId=default';
  };

  const handleDisconnect = async () => {
    const res = await fetch('/api/meta/oauth/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'default' }),
    });
    if (res.ok) {
      message.success('Conexión Meta revocada');
      setStatus({ connected: false });
    } else {
      message.error('Error al desconectar');
    }
  };

  const handlePublish = async (values: { productId: string; caption: string; platform: string }) => {
    setPublishing(true);
    try {
      const product = products.find(p => p.id === values.productId);
      if (!product?.imageUrl) {
        message.error('Selecciona un producto con imagen');
        return;
      }

      const res = await fetch('/api/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'default',
          mediaUrl: product.imageUrl,
          caption: values.caption,
          platform: values.platform,
        }),
      });

      if (res.ok) {
        message.success('Publicación en cola');
        form.resetFields();
      } else {
        const err = await res.json();
        message.error(err.error || 'Error al publicar');
      }
    } finally {
      setPublishing(false);
    }
  };

  const columns: ColumnsType<SocialPostRow> = [
    {
      title: 'Plataforma',
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      render: (v: string) => {
        const color: Record<string, string> = {
          FACEBOOK: 'blue',
          INSTAGRAM: 'pink',
          BOTH: 'purple',
        };
        return <Tag color={color[v] || 'default'}>{v}</Tag>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: string) => {
        const color: Record<string, string> = {
          PUBLISHED: 'green',
          PROCESSING: 'orange',
          FAILED: 'red',
          PENDING: 'default',
        };
        return <Tag color={color[v] || 'default'}>{v}</Tag>;
      },
    },
    {
      title: 'Descripción',
      dataIndex: 'caption',
      key: 'caption',
      ellipsis: true,
      render: (v: string) => <Text ellipsis>{v}</Text>,
    },
    {
      title: 'Meta ID',
      dataIndex: 'metaPostId',
      key: 'metaPostId',
      width: 180,
      render: (v?: string) => v ? <Text copyable>{v}</Text> : '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (v: string) => new Date(v).toLocaleString('es-CO'),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large">
          <div className="mt-3 text-gray-500 text-sm">Cargando integración Meta...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <Title level={2} className="!mb-0">Publicación en Redes Sociales</Title>
      <Paragraph type="secondary">
        Conecta tu Facebook Page e Instagram Business para publicar productos automáticamente.
      </Paragraph>

      <Card
        title={
          <span className="flex items-center gap-2">
            <ApiOutlined />
            Conexión con Meta
          </span>
        }
      >
        {status?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleOutlined />
              <Text strong>Conectado</Text>
            </div>
            <div>
              {status.pageId && <Text>Página: {status.pageId}</Text>}
              {status.hasInstagram && <Text> · Instagram: Sí</Text>}
            </div>
            <div className="ml-auto">
              <Popconfirm
                title="¿Desconectar cuenta de Meta?"
                description="Se eliminarán los tokens guardados."
                onConfirm={handleDisconnect}
                okText="Sí, desconectar"
                cancelText="Cancelar"
              >
                <Button danger icon={<DisconnectOutlined />}>Desconectar</Button>
              </Popconfirm>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <CloseCircleOutlined />
              <Text type="danger">No conectado</Text>
            </div>
            <Text type="secondary">Conecta para publicar productos en Facebook e Instagram.</Text>
            <Button type="primary" className="ml-auto" icon={<ApiOutlined />} onClick={handleConnect}>
              Conectar con Meta
            </Button>
          </div>
        )}
      </Card>

      <Card title="Publicar producto" className="mt-6">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ platform: 'BOTH' }}
          onFinish={handlePublish}
        >
          <Form.Item
            name="productId"
            label="Producto"
            rules={[{ required: true, message: 'Selecciona un producto' }]}
          >
            <Select
              showSearch
              placeholder="Buscar producto..."
              optionFilterProp="children"
              style={{ width: '100%' }}
            >
              {products.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover rounded" />}
                    <span>{p.name}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="caption"
            label="Descripción"
            rules={[{ required: true, message: 'Ingresa una descripción' }]}
          >
            <Input.TextArea rows={3} placeholder="Descripción de la publicación..." maxLength={2200} />
          </Form.Item>

          <Form.Item name="platform" label="Plataforma">
            <Select>
              <Select.Option value="FACEBOOK">Facebook</Select.Option>
              <Select.Option value="INSTAGRAM">Instagram</Select.Option>
              <Select.Option value="BOTH">Ambos</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={publishing}
              icon={<SendOutlined />}
              disabled={!status?.connected}
            >
              Publicar
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Historial de publicaciones" className="mt-6">
        <Table
          dataSource={posts}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No hay publicaciones' }}
        />
      </Card>
    </div>
  );
}
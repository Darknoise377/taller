'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Button, Card, Form, Input, message, Popconfirm, Spin, Table, Tag, Typography, Select, Modal, Image,
} from 'antd';
import {
  ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, DisconnectOutlined, SendOutlined, RobotOutlined,
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
  description?: string;
  slug?: string;
}

interface ComboItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    slug?: string;
  };
}

interface Combo {
  id: string;
  name: string;
  imageUrl?: string;
  price: number;
  description?: string;
  slug: string;
  originalPrice: number;
  items?: ComboItem[];
}

interface SocialPostRow {
  id: string;
  platform: string;
  status: string;
  metaPostId?: string;
  caption: string;
  createdAt: string;
}

type PublishableItem = Product | Combo;

export default function AdminMetaPage() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [form] = Form.useForm<{ itemId: string; caption: string; platform: string; itemType: string }>();
  const [manualForm] = Form.useForm<{ pageAccessToken: string; pageId: string; instagramAccountId?: string }>();

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/status?storeId=default');
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadCombos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/combos');
      if (res.ok) {
        const data = await res.json();
        setCombos(data || []);
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
    Promise.all([loadStatus(), loadProducts(), loadCombos(), loadPosts()])
      .finally(() => setLoading(false));
  }, [loadStatus, loadProducts, loadCombos, loadPosts]);

  const handleConnect = () => {
    window.location.href = '/api/meta/oauth/login?storeId=default';
  };

  const handleManualConnect = async (values: { pageAccessToken: string; pageId: string; instagramAccountId?: string }) => {
    try {
      const res = await fetch('/api/meta/oauth/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'default',
          ...values,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res.ok) {
        message.success('Conexión guardada');
        setManualModal(false);
        loadStatus();
      } else {
        const err = await res.json();
        message.error(err.error || 'Error al guardar');
      }
    } catch {
      message.error('Error al guardar conexión');
    }
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

  const generateCaptionAI = async (itemId: string, itemType: string) => {
    const item = itemType === 'PRODUCT' 
      ? products.find(p => p.id === itemId) as Product | undefined
      : combos.find(c => c.id === itemId) as Combo | undefined;
    
    if (!item) return;

    const productUrl = itemType === 'PRODUCT'
      ? `https://www.motoservicioayr.com/products/${item.slug || item.id}`
      : `https://www.motoservicioayr.com/combos/${item.slug}`;

    setGeneratingCaption(true);
    try {
      const res = await fetch('/api/meta/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          description: 'description' in item ? item.description : undefined,
          price: item.price,
          productUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.caption) {
        form.setFieldsValue({ caption: data.caption });
        message.success('Descripción generada con IA');
      } else {
        message.error(data.error || 'Error al generar descripción');
      }
    } catch {
      message.error('Error al generar descripción');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handlePublish = async (values: { itemId: string; caption: string; platform: string; itemType: string }) => {
    setPublishing(true);
    try {
      const item = values.itemType === 'PRODUCT'
        ? products.find(p => p.id === values.itemId) as Product | undefined
        : combos.find(c => c.id === values.itemId) as Combo | undefined;

      if (!item?.imageUrl) {
        message.error('Selecciona un producto o combo con imagen');
        return;
      }

      const res = await fetch('/api/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'default',
          mediaUrl: item.imageUrl,
          caption: values.caption,
          platform: values.platform,
        }),
      });

      if (res.ok) {
        message.success('Publicado exitosamente');
        form.resetFields();
        loadPosts();
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
      title: 'Producto',
      key: 'product',
      width: 80,
      render: (_, row) => {
        const product = products.find(p => p.id === row.caption?.substring(0, 10) || p.id === row.metaPostId?.split('_')[0]);
        return product?.imageUrl ? (
          <Image src={product.imageUrl} alt="thumb" width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : '—';
      },
    },
    {
      title: 'Plataforma',
      dataIndex: 'platform',
      key: 'platform',
      width: 110,
      render: (v: string) => {
        const colorMap: Record<string, string> = { FACEBOOK: 'blue', INSTAGRAM: 'pink', BOTH: 'purple' };
        return <Tag color={colorMap[v] || 'default'}>{v}</Tag>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => {
        const colorMap: Record<string, string> = {
          PUBLISHED: 'green',
          PROCESSING: 'orange',
          FAILED: 'red',
          PENDING: 'default',
        };
        return <Tag color={colorMap[v] || 'default'}>{v}</Tag>;
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
      width: 150,
      render: (v?: string) => v ? <Text copyable style={{ fontSize: 12 }}>{v}</Text> : '—',
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (v: string) => new Date(v).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large"><div className="mt-3 text-gray-500">Cargando integración Meta...</div></Spin>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <Title level={2} className="!mb-0">Publicación en Redes Sociales</Title>
      <Paragraph type="secondary">Conecta tu Facebook Page e Instagram para publicar productos y combos automáticamente.</Paragraph>

      <Card title={<span className="flex items-center gap-2"><ApiOutlined /> Conexión con Meta</span>}>
        {status?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleOutlined /><Text strong>Conectado</Text>
            </div>
            <div>{status.pageId && <Text>Página: {status.pageId}</Text>}</div>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => setManualModal(true)}>Editar tokens</Button>
              <Popconfirm title="¿Desconectar cuenta de Meta?" description="Se eliminarán los tokens guardados." onConfirm={handleDisconnect} okText="Sí" cancelText="Cancelar">
                <Button danger icon={<DisconnectOutlined />}>Desconectar</Button>
              </Popconfirm>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <CloseCircleOutlined /><Text type="danger">No conectado</Text>
            </div>
            <Text type="secondary">Conecta para publicar productos.</Text>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => setManualModal(true)}>Conexión manual</Button>
              <Button type="primary" icon={<ApiOutlined />} onClick={handleConnect}>Conectar con Meta</Button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Publicar producto o combo">
        <Form form={form} layout="vertical" initialValues={{ platform: 'FACEBOOK', itemType: 'PRODUCT' }} onFinish={handlePublish}>
          <Form.Item name="itemType" label="Tipo" rules={[{ required: true }]}>
            <Select style={{ width: 200 }}>
              <Select.Option value="PRODUCT">Producto</Select.Option>
              <Select.Option value="COMBO">Combo</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="itemId" label="Producto/Combo" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" style={{ width: '100%' }} onChange={(val) => {
              const type = form.getFieldValue('itemType');
              generateCaptionAI(val as string, type);
            }}>
              <Select.OptGroup label="Productos">
                {products.map(p => (
                  <Select.Option key={`p_${p.id}`} value={p.id} disabled={form.getFieldValue('itemType') !== 'PRODUCT'}>
                    <div className="flex items-center gap-2">
                      {p.imageUrl && <Image src={p.imageUrl} alt={p.name} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4 }} />}
                      <span>{p.name}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="Combos">
                {combos.map(c => (
                  <Select.Option key={`c_${c.id}`} value={c.id} disabled={form.getFieldValue('itemType') !== 'COMBO'}>
                    <div className="flex items-center gap-2">
                      {c.imageUrl && <Image src={c.imageUrl} alt={c.name} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4 }} />}
                      <span>{c.name}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select.OptGroup>
            </Select>
          </Form.Item>

          <Form.Item
            name="caption"
            label={
              <span className="flex items-center gap-2">
                Descripción
                <Button size="small" icon={<RobotOutlined />} loading={generatingCaption} onClick={() => {
                  const itemId = form.getFieldValue('itemId');
                  const itemType = form.getFieldValue('itemType');
                  if (itemId) generateCaptionAI(itemId, itemType);
                }}>
                  Generar con IA
                </Button>
              </span>
            }
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} placeholder="Descripción atractiva para la publicación..." maxLength={2200} />
          </Form.Item>

          <Form.Item name="platform" label="Plataforma">
            <Select>
              <Select.Option value="FACEBOOK">Facebook</Select.Option>
              <Select.Option value="INSTAGRAM">Instagram</Select.Option>
              <Select.Option value="BOTH">Ambos</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={publishing} icon={<SendOutlined />} disabled={!status?.connected}>
              Publicar ahora
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Modal title="Conexión manual con Meta" open={manualModal} onCancel={() => setManualModal(false)} footer={null}>
        <Form form={manualForm} layout="vertical" onFinish={handleManualConnect}>
          <Form.Item name="pageAccessToken" label="Page Access Token" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Pega el token de página infinito" />
          </Form.Item>
          <Form.Item name="pageId" label="Page ID" rules={[{ required: true }]}>
            <Input placeholder="ID de la página (ej: 123456789)" />
          </Form.Item>
          <Form.Item name="instagramAccountId" label="Instagram Account ID (opcional)">
            <Input placeholder="ID de cuenta de Instagram Business" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Guardar conexión</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Card title="Historial de publicaciones">
        <Table dataSource={posts} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10 }} locale={{ emptyText: 'No hay publicaciones' }} />
      </Card>
    </div>
  );
}
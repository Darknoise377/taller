'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Modal,
  Input,
  Select,
  Spin,
  message,
  Table,
  Popconfirm,
  Form,
  InputNumber,
  Card,
  Space,
  Typography,
  Tag,
  Switch,
  Divider,
  DatePicker,
  Upload,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
  RobotOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { formatCurrency } from '@/utils/formatCurrency';
import { uploadImage } from '@/services/productService';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ProductOption {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface ComboItemForm {
  productId: string;
  quantity: number;
}

interface ComboData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  currency: string;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  stock: number;
  badge?: string;
  expiresAt?: string;
  soldCount: number;
  items: Array<{ id: number; productId: string; quantity: number; product: { id: string; name: string; price: number } }>;
  surpriseGift?: { id: number; hint?: string; giftName: string; giftValue?: number } | null;
  _count?: { orderCombos: number };
}

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<ComboData[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSurpriseGift, setHasSurpriseGift] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [form] = Form.useForm();

  const loadCombos = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/combos');
      if (!r.ok) throw new Error('Error al cargar combos');
      setCombos(await r.json());
    } catch {
      message.error('No se pudieron cargar los combos');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const r = await fetch('/api/products?all=true&limit=500');
      if (!r.ok) return;
      const data = await r.json();
      const list = Array.isArray(data) ? data : data.items ?? [];
      setProducts(list.map((p: { id: string; name: string; price: number; stock: number }) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock })));
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadCombos();
    loadProducts();
  }, [loadCombos, loadProducts]);

  const handleAnalyzeImage = useCallback(async () => {
    // If there's a new local file, upload it first, then analyze
    const newFile = fileList.find((f) => f.originFileObj);
    const existingUrl = fileList.find((f) => f.url)?.url;

    let imageUrl: string | undefined = existingUrl;

    if (newFile?.originFileObj) {
      setIsAnalyzingImage(true);
      try {
        const uploaded = await uploadImage(newFile.originFileObj as File);
        imageUrl = uploaded.url;
        // Update fileList to reflect the uploaded URL
        setFileList([{ uid: newFile.uid, name: newFile.name, status: 'done', url: imageUrl }]);
      } catch {
        message.error('Error al subir la imagen antes de analizar');
        setIsAnalyzingImage(false);
        return;
      }
    }

    if (!imageUrl) {
      message.warning('Sube una imagen primero para analizar con IA.');
      setIsAnalyzingImage(false);
      return;
    }

    setIsAnalyzingImage(true);
    try {
      const res = await fetch('/api/admin/combos/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json() as { name?: string; description?: string; error?: string };
      if (!res.ok || !data.name) throw new Error(data.error ?? 'Error al analizar');
      form.setFieldsValue({ name: data.name, description: data.description, slug: slugify(data.name) });
      message.success('Nombre y descripción generados con IA ✨');
    } catch (err) {
      message.error((err as Error).message ?? 'Error al analizar imagen');
    } finally {
      setIsAnalyzingImage(false);
    }
  }, [fileList, form]);

  const handleGenerateDescription = useCallback(async () => {
    const name = form.getFieldValue('name') as string | undefined;
    if (!name?.trim()) { message.warning('Primero ingresa el nombre del combo.'); return; }
    setIsGeneratingDesc(true);
    try {
      const formItems = (form.getFieldValue('items') as ComboItemForm[] | undefined) ?? [];
      const itemNames = formItems
        .map((i) => products.find((p) => p.id === i.productId)?.name)
        .filter(Boolean) as string[];
      const res = await fetch('/api/admin/combos/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), items: itemNames }),
      });
      const data = await res.json() as { description?: string; error?: string };
      if (!res.ok || !data.description) throw new Error(data.error ?? 'Error al generar');
      form.setFieldsValue({ description: data.description });
      message.success('Descripción generada con IA ✨');
    } catch (err) {
      message.error((err as Error).message ?? 'Error al generar descripción');
    } finally {
      setIsGeneratingDesc(false);
    }
  }, [form]);

  const openCreate = () => {
    setEditingCombo(null);
    setHasSurpriseGift(false);
    setFileList([]);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (combo: ComboData) => {
    setEditingCombo(combo);
    setHasSurpriseGift(!!combo.surpriseGift);
    setFileList(combo.imageUrl ? [{ uid: '-1', name: 'imagen-actual', status: 'done', url: combo.imageUrl }] : []);
    form.setFieldsValue({
      name: combo.name,
      slug: combo.slug,
      description: combo.description,
      price: combo.price,
      originalPrice: combo.originalPrice,
      currency: combo.currency,
      imageUrl: combo.imageUrl,
      isActive: combo.isActive,
      isFeatured: combo.isFeatured,
      stock: combo.stock,
      badge: combo.badge,
      expiresAt: combo.expiresAt ? dayjs(combo.expiresAt) : null,
      items: combo.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      giftHint: combo.surpriseGift?.hint,
      giftName: combo.surpriseGift?.giftName,
      giftValue: combo.surpriseGift?.giftValue,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);

      // Upload image if a new file was selected
      let finalImageUrl: string | undefined = editingCombo?.imageUrl;
      const newFile = fileList.find((f) => f.originFileObj);
      if (newFile?.originFileObj) {
        try {
          const uploaded = await uploadImage(newFile.originFileObj as File);
          finalImageUrl = uploaded.url;
        } catch {
          message.error('Error al subir la imagen');
          setIsSaving(false);
          return;
        }
      } else if (fileList.length === 0) {
        finalImageUrl = undefined;
      }

      const payload = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        price: values.price,
        originalPrice: values.originalPrice,
        currency: values.currency ?? 'COP',
        imageUrl: finalImageUrl,
        isActive: values.isActive ?? true,
        isFeatured: values.isFeatured ?? false,
        stock: values.stock,
        badge: values.badge,
        expiresAt: values.expiresAt ? (values.expiresAt as dayjs.Dayjs).toISOString() : null,
        items: (values.items as ComboItemForm[]) ?? [],
        ...(hasSurpriseGift
          ? { surpriseGift: { hint: values.giftHint, giftName: values.giftName, giftValue: values.giftValue } }
          : {}),
      };

      const url = editingCombo ? `/api/admin/combos/${editingCombo.id}` : '/api/admin/combos';
      const method = editingCombo ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();

      if (!r.ok) {
        message.error(data.error ?? 'Error al guardar combo');
        return;
      }

      message.success(editingCombo ? 'Combo actualizado' : 'Combo creado');
      setModalOpen(false);
      loadCombos();
    } catch (err) {
      if ((err as { errorFields?: unknown }).errorFields) return; // validation
      message.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/combos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      message.success('Combo eliminado');
      setCombos((prev) => prev.filter((c) => c.id !== id));
    } catch {
      message.error('Error al eliminar combo');
    }
  };

  const columns: ColumnsType<ComboData> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.slug}</Text>
        </Space>
      ),
    },
    {
      title: 'Precio',
      dataIndex: 'price',
      render: (price: number, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{formatCurrency(price, record.currency as 'COP' | 'USD' | 'EUR')}</Text>
          <Text delete type="secondary" style={{ fontSize: 12 }}>{formatCurrency(record.originalPrice, record.currency as 'COP' | 'USD' | 'EUR')}</Text>
        </Space>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      render: (v: number) => (
        <Tag color={v === 0 ? 'red' : v <= 5 ? 'orange' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: 'Productos',
      dataIndex: 'items',
      render: (items: ComboData['items']) => <Tag>{items.length} ítems</Tag>,
    },
    {
      title: 'Regalo',
      dataIndex: 'surpriseGift',
      render: (g: ComboData['surpriseGift']) =>
        g ? <Tag color="purple" icon={<GiftOutlined />}>Sí</Tag> : <Tag>No</Tag>,
    },
    {
      title: 'Pedidos',
      dataIndex: '_count',
      render: (c?: { orderCombos: number }) => c?.orderCombos ?? 0,
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_: unknown, record: ComboData) => (
        <Space>
          {record.isActive ? <Tag color="green">Activo</Tag> : <Tag color="default">Inactivo</Tag>}
          {record.isFeatured && <Tag color="blue">Destacado</Tag>}
        </Space>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: unknown, record: ComboData) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Editar</Button>
          <Popconfirm
            title="¿Eliminar este combo?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleDelete(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>Eliminar</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>🎁 Gestión de Combos</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo Combo
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        ) : (
          <Table
            dataSource={combos}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>

      <Modal
        title={editingCombo ? 'Editar Combo' : 'Crear Combo'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText={editingCombo ? 'Guardar cambios' : 'Crear combo'}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Nombre del combo" rules={[{ required: true }]}>
            <Input placeholder="Ej: Combo Frenos Premium" />
          </Form.Item>
          <Form.Item name="slug" label="Slug (URL amigable)" extra="Déjalo vacío para generarlo automáticamente">
            <Input placeholder="combo-frenos-premium" />
          </Form.Item>
          <Form.Item
            label={
              <Space>
                <span>Descripción</span>
                <Tooltip title="Generar con IA (requiere nombre)">
                  <Button
                    size="small"
                    type="dashed"
                    icon={isGeneratingDesc ? <LoadingOutlined /> : <RobotOutlined />}
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDesc}
                  >
                    IA
                  </Button>
                </Tooltip>
              </Space>
            }
            name="description"
            rules={[{ required: true, message: 'Ingresa una descripción' }]}
          >
            <TextArea rows={3} placeholder="Describe qué incluye el combo y sus beneficios" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="price" label="Precio combo (COP)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="originalPrice" label="Precio original (COP)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="stock" label="Stock disponible" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="currency" label="Moneda" initialValue="COP">
              <Select options={[{ value: 'COP', label: 'COP' }, { value: 'USD', label: 'USD' }]} />
            </Form.Item>
          </div>

          <Form.Item name="badge" label="Badge (ej: NUEVO, HOT)">
            <Input placeholder="LIMITADO" />
          </Form.Item>
          <Form.Item label="Imagen del combo">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onRemove={() => setFileList([])}
              beforeUpload={() => false}
              onChange={({ fileList: newList }) => setFileList(newList.slice(-1))}
              accept="image/*"
            >
              {fileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Subir imagen</div>
                </div>
              )}
            </Upload>
            {fileList.length > 0 && (
              <Tooltip title="Analiza la imagen con IA y rellena nombre + descripción automáticamente">
                <Button
                  icon={isAnalyzingImage ? <LoadingOutlined /> : <RobotOutlined />}
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzingImage}
                  type="dashed"
                  style={{ marginTop: 8 }}
                >
                  {isAnalyzingImage ? 'Analizando...' : '✨ Generar nombre + descripción con IA'}
                </Button>
              </Tooltip>
            )}
          </Form.Item>
          <Form.Item name="expiresAt" label="Fecha de expiración (opcional)">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <Form.Item name="isActive" label="Activo" valuePropName="checked" initialValue={true} style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="isFeatured" label="Destacado en homepage" valuePropName="checked" initialValue={false} style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <Divider>Productos incluidos</Divider>

          <Form.List name="items" rules={[{ validator: async (_, val) => { if (!val || val.length < 1) throw new Error('Agrega al menos un producto'); } }]}>
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Form.Item {...rest} name={[name, 'productId']} rules={[{ required: true, message: 'Selecciona un producto' }]} style={{ flex: 1, margin: 0 }}>
                      <Select
                        showSearch
                        placeholder="Buscar producto..."
                        optionFilterProp="label"
                        options={products.map((p) => ({ value: p.id, label: `${p.name} — ${formatCurrency(p.price, 'COP')}` }))}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true }]} initialValue={1} style={{ width: 80, margin: 0 }}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)}>×</Button>
                  </div>
                ))}
                <Form.ErrorList errors={errors} />
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                  Agregar producto
                </Button>
              </>
            )}
          </Form.List>

          <Divider>
            <Space>
              <GiftOutlined />
              Regalo Sorpresa
              <Switch size="small" checked={hasSurpriseGift} onChange={setHasSurpriseGift} />
            </Space>
          </Divider>

          {hasSurpriseGift && (
            <>
              <Form.Item name="giftName" label="Nombre del regalo (interno, no visible para el cliente)" rules={[{ required: hasSurpriseGift, message: 'Ingresa el nombre del regalo' }]}>
                <Input placeholder="Ej: Guantes de moto XL" />
              </Form.Item>
              <Form.Item name="giftHint" label="Pista para el cliente (visible en la tienda)">
                <Input placeholder="Ej: Accesorio de protección" />
              </Form.Item>
              <Form.Item name="giftValue" label="Valor aproximado del regalo (COP)">
                <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}

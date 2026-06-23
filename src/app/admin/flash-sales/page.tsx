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
  DatePicker,
  Switch,
  Tag,
  Divider,
  Space,
  Card,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PRODUCT_CATEGORY_OPTIONS } from '@/constants/productCategories';
import { getProductCategoryLabel } from '@/constants/productCategories';
import type { DiscountMode } from '@/types/flash-sale';

interface ProductOption {
  id: string;
  name: string;
  price: number;
}

interface FlashSaleData {
  id: string;
  name: string;
  description: string | null;
  discount: number;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  appliesTo: string;
  targetCategories: string[];
  targetProductIds: string[];
  mode: DiscountMode;
  targetPrice: number | null;
  _count?: { products?: number };
}

export default function AdminFlashSalesPage() {
  const [flashSales, setFlashSales] = useState<FlashSaleData[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<FlashSaleData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form] = Form.useForm();
  const [selectedAppliesTo, setSelectedAppliesTo] = useState<'ALL' | 'CATEGORY' | 'PRODUCT'>('ALL');

  const loadFlashSales = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/flash-sales');
      if (!r.ok) throw new Error('Error al cargar ofertas');
      setFlashSales(await r.json());
    } catch {
      message.error('No se pudieron cargar las ofertas relámpago');
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
      setProducts(list.map((p: { id: string; name: string; price: number }) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      })));
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadFlashSales();
    loadProducts();
  }, [loadFlashSales, loadProducts]);

  const openCreate = () => {
    setEditingSale(null);
    setSelectedAppliesTo('ALL');
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (sale: FlashSaleData) => {
    setEditingSale(sale);
    setSelectedAppliesTo(sale.appliesTo as 'ALL' | 'CATEGORY' | 'PRODUCT');
    form.setFieldsValue({
      name: sale.name,
      description: sale.description,
      discount: sale.discount,
      startTime: dayjs(sale.startTime),
      endTime: sale.endTime ? dayjs(sale.endTime) : null,
      isActive: sale.isActive,
      appliesTo: sale.appliesTo,
      targetCategories: sale.targetCategories,
      targetProductIds: sale.targetProductIds,
      mode: sale.mode,
      targetPrice: sale.targetPrice,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);

      const payload = {
        name: values.name,
        description: values.description,
        discount: values.discount,
        startTime: (values.startTime as dayjs.Dayjs).toISOString(),
        endTime: values.endTime ? (values.endTime as dayjs.Dayjs).toISOString() : null,
        isActive: values.isActive ?? true,
        appliesTo: values.appliesTo,
        targetCategories:
          values.appliesTo === 'CATEGORY' ? values.targetCategories : [],
        targetProductIds:
          values.appliesTo === 'PRODUCT' ? values.targetProductIds : [],
        mode: values.mode ?? 'ANCHOR',
        targetPrice: values.mode === 'FIXED_PRICE' ? values.targetPrice : null,
      };

      const url = editingSale
        ? `/api/admin/flash-sales/${editingSale.id}`
        : '/api/admin/flash-sales';
      const method = editingSale ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error ?? 'Error al guardar');
      }

      message.success(editingSale ? 'Oferta actualizada' : 'Oferta creada');
      setModalOpen(false);
      loadFlashSales();
    } catch (err: unknown) {
      message.error((err as Error).message ?? 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/flash-sales/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      message.success('Oferta eliminada');
      setFlashSales((prev) => prev.filter((s) => s.id !== id));
    } catch {
      message.error('Error al eliminar');
    }
  };

  const columns: ColumnsType<FlashSaleData> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      render: (name: string, record) => (
        <div>
          <strong>{name}</strong>
          <br />
          <small className="text-gray-500">
            {record.appliesTo === 'ALL'
              ? 'Todos los productos'
              : record.appliesTo === 'CATEGORY'
              ? `Categorías: ${record.targetCategories.map(getProductCategoryLabel).join(', ')}`
              : `${record.targetProductIds.length} producto(s)`}
          </small>
        </div>
      ),
    },
    {
      title: 'Descuento',
      dataIndex: 'discount',
      render: (v: number) => <Tag color="red">-{v}%</Tag>,
    },
    {
      title: 'Vigencia',
      key: 'duration',
      render: (_, record) => (
        <div>
          <div>Inicio: {new Date(record.startTime).toLocaleString('es-CO')}</div>
          <div>
            Fin: {record.endTime ? new Date(record.endTime).toLocaleString('es-CO') : 'Sin límite'}
          </div>
        </div>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_, record) =>
        record.isActive ? (
          <Tag color="green">Activo</Tag>
        ) : (
          <Tag color="default">Inactivo</Tag>
        ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar esta oferta?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>⚡ Ofertas por Tiempo Limitado</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nueva Oferta
          </Button>
        </div>

        <Spin spinning={loading}>
          <Table
            dataSource={flashSales}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 800 }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingSale ? 'Editar Oferta' : 'Crear Oferta'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText={editingSale ? 'Guardar cambios' : 'Crear oferta'}
        width={680}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Nombre de la oferta"
            rules={[{ required: true, message: 'Ingresa un nombre' }]}
          >
            <Input placeholder="Ej: Oferta de Verano" />
          </Form.Item>

          <Form.Item name="description" label="Descripción (opcional)">
            <Input.TextArea rows={2} placeholder="Descripción breve de la campaña" />
          </Form.Item>

          <Form.Item
            name="discount"
            label="% Descuento"
            rules={[{ required: true, message: 'Ingresa el porcentaje' }]}
          >
            <InputNumber
              min={1}
              max={90}
              style={{ width: '100%' }}
              placeholder="Ej: 10"
            />
          </Form.Item>

          <Form.Item
            name="startTime"
            label="Fecha y hora de inicio"
            rules={[{ required: true, message: 'Selecciona fecha inicio' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="endTime" label="Fecha y hora de fin (opcional)">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

<Form.Item name="isActive" label="Activo" valuePropName="checked" initialValue={true}>
             <Switch />
           </Form.Item>

           <Form.Item
             name="mode"
             label="Modo de descuento"
             initialValue="ANCHOR"
           >
             <Radio.Group>
               <Radio value="REAL">Descuento Real</Radio>
               <Radio value="ANCHOR">Precio Anclado</Radio>
               <Radio value="FIXED_PRICE">Precio Final Fijo</Radio>
             </Radio.Group>
           </Form.Item>

<Form.Item
              name="targetPrice"
              label="Precio Final Deseado"
              tooltip="Solo para modo FIXED_PRICE: el precio que pagará el cliente"
              style={{ display: form.getFieldValue('mode') === 'FIXED_PRICE' ? 'block' : 'none' }}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="Ej: 445000"
              />
            </Form.Item>

           <Divider>Alcance del descuento</Divider>

          <Form.Item
            name="appliesTo"
            label="Aplica a"
            initialValue="ALL"
          >
            <Select
              options={[
                { value: 'ALL', label: 'Todos los productos' },
                { value: 'CATEGORY', label: 'Categorías específicas' },
                { value: 'PRODUCT', label: 'Productos específicos' },
              ]}
              onChange={(val) => setSelectedAppliesTo(val as 'ALL' | 'CATEGORY' | 'PRODUCT')}
            />
          </Form.Item>

          {selectedAppliesTo === 'CATEGORY' && (
            <Form.Item
              name="targetCategories"
              label="Categorías"
              rules={[{ required: true, message: 'Selecciona al menos una categoría' }]}
            >
              <Select
                mode="multiple"
                placeholder="Selecciona categorías"
                options={PRODUCT_CATEGORY_OPTIONS}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}

          {selectedAppliesTo === 'PRODUCT' && (
            <Form.Item
              name="targetProductIds"
              label="Productos"
              rules={[{ required: true, message: 'Selecciona al menos un producto' }]}
            >
              <Select
                mode="multiple"
                showSearch
                placeholder="Buscar productos..."
                optionFilterProp="label"
                maxTagCount="responsive"
                options={products.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
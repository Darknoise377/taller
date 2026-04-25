'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Product } from '@/types/product';
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
  Upload,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Image,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import { productService, uploadImage } from '@/services/productService';
import { PRODUCT_CATEGORY_OPTIONS, getProductCategoryLabel } from '@/constants/productCategories';
import { formatCurrency } from '@/utils/formatCurrency';

// --- Constantes y Opciones ---
const CATEGORY_OPTIONS = PRODUCT_CATEGORY_OPTIONS;
const CURRENCY_OPTIONS = ['USD', 'EUR', 'COP'];

// --- Componente Principal ---
export default function AdminProductsPage() {
  // --- Estados ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    return 'Error desconocido';
  };

  const hasErrorFields = (err: unknown): err is { errorFields: unknown } => {
    return typeof err === 'object' && err !== null && 'errorFields' in err;
  };

  // --- Efectos y Carga de Datos ---
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      message.error(
        (error as Error).message || 'Error al cargar los productos'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // --- Manejadores de Eventos (Handlers) ---

  const handleSaveProduct = async () => {
    try {
      const values = await form.validateFields();
      setIsSaving(true);

      // 1. Separar imágenes existentes de archivos nuevos
      const existingImages = fileList
        .map((f) => f.url)
        .filter(Boolean) as string[];
      const filesToUpload = fileList.filter((f) => f.originFileObj);

      if (!editingProduct && filesToUpload.length === 0) {
        message.error('Un producto nuevo debe tener al menos una imagen.');
        setIsSaving(false);
        return;
      }

      // 2. Subir las imágenes nuevas a Cloudinary (o tu servicio)
      let uploadedImageUrls: string[] = [];
      if (filesToUpload.length > 0) {
        const uploadPromises = filesToUpload.map((file) =>
          uploadImage(file.originFileObj as File)
        );
        const results = await Promise.all(uploadPromises);
        uploadedImageUrls = results.map((res) => res.url);
      }

      // 3. Combinar todas las URLs de imágenes
      const allImageUrls = [...existingImages, ...uploadedImageUrls];
      if (allImageUrls.length === 0) {
          message.error('El producto debe tener al menos una imagen.');
          setIsSaving(false);
          return;
      }

      // 4. Construir el payload final para la API
      const payload: Partial<Product> = {
        ...values,
        price: Number(values.price),
        stock: Number(values.stock ?? 0),
        category: values.category?.toLowerCase(),
        images: allImageUrls,
        imageUrl: allImageUrls[0], // La primera imagen como principal
        sizes: Array.isArray(values.sizes) ? values.sizes : [],
        colors: Array.isArray(values.colors) ? values.colors : [],
        tags: Array.isArray(values.tags) ? values.tags : [],
      };

      // 5. Enviar a la API (Crear o Actualizar)
      if (editingProduct) {
        await productService.updateProduct(Number(editingProduct.id), payload);
        message.success('Producto actualizado con éxito');
      } else {
        await productService.createProduct(payload);
        message.success('Producto creado con éxito');
      }

      setModalOpen(false);
      fetchProducts();
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      if (!hasErrorFields(error)) {
        message.error(`Error al guardar: ${getErrorMessage(error)}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = useCallback(async (id: number) => {
    try {
      await productService.deleteProduct(id);
      message.success('Producto eliminado con éxito');
      setProducts((prev) => prev.filter((p) => Number(p.id) !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      message.error(
        (error as Error).message || 'Error al eliminar el producto'
      );
    }
  }, []);

  // --- Funciones del Modal y Formulario ---
  const openModal = useCallback((product?: Product) => {
    setEditingProduct(product || null);
    if (product) {
      form.setFieldsValue({ ...product });
      const initialFileList = (product.images ?? []).map((url, index) => ({
        uid: `${-index - 1}`,
        name: `imagen-${index + 1}.jpg`,
        status: 'done' as const,
        url,
      }));
      setFileList(initialFileList);
    } else {
      form.resetFields();
      setFileList([]);
    }
    setModalOpen(true);
  }, [form]);

  // --- Definición de Columnas para la Tabla ---
  const columns: ColumnsType<Product> = useMemo(() => [
    {
      title: 'Imagen',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      render: (imageUrl: string, record) => (
        <Image
          width={60}
          height={60}
          src={imageUrl || record.images?.[0]}
          alt={record.name}
          style={{ objectFit: 'cover', borderRadius: '4px' }}
          fallback="/placeholder.png" // Una imagen por defecto si no hay
        />
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Precio',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => a.price - b.price,
      render: (price: number, record) => formatCurrency(price, record.currency ?? 'COP'),
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      filters: CATEGORY_OPTIONS.map(c => ({ text: c.label, value: c.value })),
      render: (category: string) => <Tag>{getProductCategoryLabel(category)}</Tag>,
      onFilter: (value, record) => record.category.indexOf(value as string) === 0,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string) => sku ? <span className="font-mono">{sku}</span> : null,
    },
    {
      title: 'Etiquetas',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags?.map((t) => <Tag key={t}>{t}</Tag>)}
        </>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      sorter: (a, b) => (a.stock ?? 0) - (b.stock ?? 0),
    },
     {
      title: 'Medidas/Compatibilidad',
      dataIndex: 'sizes',
      key: 'sizes',
      render: (sizes: string[]) => (
        <>
          {sizes?.map((size) => <Tag key={size}>{size.toUpperCase()}</Tag>)}
        </>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          />
          <Popconfirm
            title="¿Estás seguro de eliminar este producto?"
            onConfirm={() => handleDeleteProduct(Number(record.id))}
            okText="Sí, eliminar"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleDeleteProduct, openModal]);

  // --- Renderizado del Componente ---
return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Typography.Title level={2} style={{ margin: 0 }}>
          Gestión de Productos
        </Typography.Title>

        <div className="w-full sm:w-auto">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
            className="w-full sm:w-auto"
          >
            Añadir Producto
          </Button>
        </div>
      </div>

    <Card>
      <Spin spinning={loading}>
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          scroll={{ x: "max-content" }} // Responsividad
            pagination={{ pageSize: 10, showSizeChanger: true, responsive: true }}
        />
      </Spin>
    </Card>

    <Modal
      open={modalOpen}
      title={editingProduct ? "Editar Producto" : "Crear Nuevo Producto"}
      onCancel={() => setModalOpen(false)}
      onOk={handleSaveProduct}
      confirmLoading={isSaving}
      okText="Guardar"
      cancelText="Cancelar"
      width="min(720px, 92vw)"
      forceRender
    >
      <Form
        layout="vertical"
        form={form}
        name="product_form"
        initialValues={{ stock: 0, currency: "USD" }}
      >
        {/* --- Nombre del producto --- */}
        <Form.Item
          label="Nombre del Producto"
          name="name"
          rules={[{ required: true, message: "El nombre es obligatorio" }]}
        >
          <Input placeholder="Ej: Cilindro AKT 125, Llanta 90/90-17" />
        </Form.Item>

        {/* --- Descripción --- */}
        <Form.Item
          label="Descripción"
          name="description"
          rules={[
            { required: true, message: "La descripción es obligatoria" },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Describe la referencia, uso, compatibilidad y recomendaciones de instalacion."
          />
        </Form.Item>

        {/* --- Precio y moneda --- */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Precio"
              name="price"
              rules={[{ required: true, message: "El precio es obligatorio" }]}
            >
              <InputNumber<number>
                min={0}
                style={{ width: "100%" }}
                formatter={(value) =>
                  value
                    ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    : ""
                }
                parser={(value) =>
                  Number(value?.replace(/\$\s?|(,*)/g, "") || 0)
                }
                placeholder="Ej: 49.99"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Moneda"
              name="currency"
              rules={[{ required: true, message: "La moneda es obligatoria" }]}
            >
              <Select
                options={CURRENCY_OPTIONS.map((c) => ({
                  value: c,
                  label: c,
                }))}
                placeholder="Selecciona la moneda"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* --- Categoría y Stock --- */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Categoría"
              name="category"
              rules={[
                { required: true, message: "La categoría es obligatoria" },
              ]}
            >
              <Select
                options={CATEGORY_OPTIONS}
                placeholder="Selecciona una categoría"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Stock disponible"
              name="stock"
              rules={[{ required: true, message: "El stock es obligatorio" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                placeholder="Ej: 25"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* --- SKU, Número diagrama y etiquetas --- */}
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="SKU (opcional)" name="sku">
              <Input placeholder="Ej: SKU-12345" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Número en Diagrama (opcional)" name="diagramNumber">
              <Input placeholder="Ej: 14A" />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item label="Etiquetas (opcional)" name="tags">
              <Select mode="tags" allowClear placeholder="Ej: motor, filtro" />
            </Form.Item>
          </Col>
        </Row>

        {/* --- Medidas y atributos --- */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Medidas / compatibilidad (opcional)" name="sizes">
              <Select
                mode="tags"
                allowClear
                placeholder="Ej: 90/90-17, CG150, FZ16"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Colores disponibles (opcional)"
              name="colors"
            >
              <Select
                mode="tags"
                placeholder="Ej: NKD125, FZ16, Gixxer150"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* --- Imágenes del producto --- */}
        <Form.Item
          label="Imágenes del Producto"
          required
          tooltip="Puedes subir hasta 5 imágenes"
        >
          <Upload
            listType="picture-card"
            fileList={fileList}
            onRemove={(file) => {
              const newFileList = fileList.filter((f) => f.uid !== file.uid);
              setFileList(newFileList);
            }}
            beforeUpload={() => false} // Evita la subida automática
            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
          >
            {fileList.length < 5 && (
              <div>
                <PlusOutlined />
                <div className="mt-2">Subir</div>
              </div>
            )}
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  </div>
);
}

// Puedes añadir otros datos del token aquí si los necesitas


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
  Divider,
  Tooltip,
  Checkbox,
} from 'antd';
import {
  CalculatorOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import { productService, uploadImage } from '@/services/productService';
import { PRODUCT_CATEGORY_OPTIONS, getProductCategoryLabel } from '@/constants/productCategories';
import { formatCurrency } from '@/utils/formatCurrency';
import { DEFAULT_SHIPPING_CONFIG } from '@/config/shippingRates';
import type { ShippingConfig } from '@/config/shippingRates';

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
  const [isExporting, setIsExporting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  // --- Calculadora de precio ---
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcCost, setCalcCost] = useState<number>(0);
  const [calcMargin, setCalcMargin] = useState<number>(35);
  const [calcContraentregaPct, setCalcContraentregaPct] = useState<number>(40);
  const [calcAbsorbShipping, setCalcAbsorbShipping] = useState(true);
  const [calcAbsorbContraentrega, setCalcAbsorbContraentrega] = useState(true);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const handleGenerateDescription = useCallback(async () => {
    const name = form.getFieldValue('name') as string | undefined;
    if (!name?.trim()) {
      message.warning('Primero ingresa el nombre del producto.');
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const res = await fetch('/api/admin/products/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category: form.getFieldValue('category') as string | undefined,
          brand: form.getFieldValue('brand') as string | undefined,
          sku: form.getFieldValue('sku') as string | undefined,
          tags: form.getFieldValue('tags') as string[] | undefined,
        }),
      });
      const data = await res.json() as { description?: string; error?: string };
      if (!res.ok || !data.description) throw new Error(data.error ?? 'Error al generar');
      form.setFieldsValue({ description: data.description });
      message.success('Descripción generada con IA');
    } catch (err) {
      message.error((err as Error).message ?? 'Error al generar descripción');
    } finally {
      setIsGeneratingDesc(false);
    }
  }, [form]);

  useEffect(() => {
    fetch('/api/store-settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.shippingRules) setShippingConfig(data.shippingRules as ShippingConfig); })
      .catch(() => {});
  }, []);

  const avgShippingRate = useMemo(() => {
    if (shippingConfig.freeShippingAll) return 0;
    const rates = shippingConfig.regions.map(r => r.baseRate);
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [shippingConfig]);

  const contraentregaUnit = useMemo(() => {
    return Math.round((calcContraentregaPct / 100) * shippingConfig.contraentregaSurcharge);
  }, [calcContraentregaPct, shippingConfig.contraentregaSurcharge]);

  const suggestedPrice = useMemo(() => {
    if (calcCost <= 0 || calcMargin >= 100) return 0;
    const shippingCost = calcAbsorbShipping ? avgShippingRate : 0;
    const contraentregaCost = calcAbsorbContraentrega ? contraentregaUnit : 0;
    const totalCost = calcCost + shippingCost + contraentregaCost;
    return Math.ceil(totalCost / (1 - calcMargin / 100) / 100) * 100;
  }, [calcCost, calcMargin, calcAbsorbShipping, calcAbsorbContraentrega, avgShippingRate, contraentregaUnit]);

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
        await productService.updateProduct(editingProduct.id, payload);
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

  const handleExportExcel = useCallback(async () => {
    if (products.length === 0) {
      message.warning('No hay productos para exportar.');
      return;
    }
    setIsExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Motoservicio A&R Admin';
      wb.created = new Date();
      const ws = wb.addWorksheet('Productos');

      ws.columns = [
        { header: 'ID', key: 'id', width: 38 },
        { header: 'Nombre', key: 'name', width: 40 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Precio', key: 'price', width: 14 },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'SKU', key: 'sku', width: 18 },
        { header: 'Medidas', key: 'sizes', width: 30 },
        { header: 'Compatibilidad', key: 'colors', width: 30 },
        { header: 'Etiquetas', key: 'tags', width: 30 },
        { header: 'Descripción', key: 'description', width: 50 },
        { header: 'Creado', key: 'createdAt', width: 22 },
      ];

      // Header row style
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2A66' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      products.forEach((p) => {
        ws.addRow({
          id: p.id,
          name: p.name,
          category: getProductCategoryLabel(p.category),
          price: p.price,
          currency: p.currency ?? 'COP',
          stock: p.stock ?? 0,
          sku: p.sku ?? '',
          sizes: (p.sizes ?? []).join(', '),
          colors: (p.colors ?? []).join(', '),
          tags: (p.tags ?? []).join(', '),
          description: p.description ?? '',
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString('es-CO') : '',
        });
      });

      // Auto-filter
      ws.autoFilter = { from: 'A1', to: 'L1' };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`${products.length} productos exportados correctamente.`);
    } catch (err) {
      console.error('Error exportando productos:', err);
      message.error('Error al exportar productos.');
    } finally {
      setIsExporting(false);
    }
  }, [products]);

  const handleDeleteProduct = useCallback(async (id: string) => {
    try {
      await productService.deleteProduct(id);
      message.success('Producto eliminado con éxito');
      setProducts((prev) => prev.filter((p) => p.id !== id));
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
      title: 'MeLi',
      key: 'meliExport',
      align: 'center',
      render: (_, record) => (
        <Tooltip title={record.meliExport ? 'Exportar a MeLi: ON' : 'Exportar a MeLi: OFF'}>
          <Tag
            color={record.meliExport ? 'green' : 'default'}
            style={{ cursor: 'pointer' }}
            onClick={async () => {
              try {
                await productService.updateProduct(record.id, { meliExport: !record.meliExport });
                await fetchProducts();
              } catch { message.error('Error al actualizar'); }
            }}
          >
            {record.meliExport ? 'ON' : 'OFF'}
          </Tag>
        </Tooltip>
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
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="Sí, eliminar"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleDeleteProduct, openModal, fetchProducts]);

  // --- Renderizado del Componente ---
return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Typography.Title level={2} style={{ margin: 0 }}>
          Gestión de Productos
        </Typography.Title>

        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            loading={isExporting}
          >
            Exportar Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            Añadir Producto
          </Button>
        </Space>
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
          label={
            <Space size={8}>
              <span>Descripción</span>
              <Button
                size="small"
                icon={<RobotOutlined />}
                loading={isGeneratingDesc}
                onClick={handleGenerateDescription}
                style={{ fontSize: 12 }}
              >
                Generar con IA
              </Button>
            </Space>
          }
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

        {/* --- Calculadora de precio mínimo --- */}
        <div style={{ marginBottom: 16 }}>
          <Button
            type="link"
            icon={<CalculatorOutlined />}
            style={{ padding: 0, fontSize: 13 }}
            onClick={() => setCalcOpen(o => !o)}
          >
            {calcOpen ? 'Ocultar calculadora de precio' : 'Calcular precio mínimo sugerido'}
          </Button>

          {calcOpen && (
            <div style={{ marginTop: 12, padding: '12px 16px', background: '#f0f5ff', borderRadius: 8, border: '1px solid #adc6ff' }}>
              <Typography.Text strong style={{ fontSize: 13 }}>Calculadora de precio</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 12px' }}>
                Calcula el precio sugerido eligiendo qué costos absorbes en el precio de venta.
              </Typography.Paragraph>

              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <div style={{ marginBottom: 8 }}>
                    <Tooltip title="Cuánto te costó el producto (sin envío)">
                      <Typography.Text style={{ fontSize: 12 }}>Costo del producto (COP)</Typography.Text>
                    </Tooltip>
                    <InputNumber
                      min={0}
                      step={1000}
                      style={{ width: '100%', marginTop: 4 }}
                      value={calcCost}
                      onChange={v => setCalcCost(v ?? 0)}
                      formatter={v => v ? `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      parser={v => Number(v?.replace(/\$\s?|(,*)/g, '') || 0)}
                    />
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ marginBottom: 8 }}>
                    <Tooltip title="Porcentaje de ganancia deseado sobre el precio de venta">
                      <Typography.Text style={{ fontSize: 12 }}>Margen deseado (%)</Typography.Text>
                    </Tooltip>
                    <InputNumber
                      min={1}
                      max={99}
                      style={{ width: '100%', marginTop: 4 }}
                      value={calcMargin}
                      onChange={v => setCalcMargin(v ?? 35)}
                      formatter={v => `${v}%`}
                      parser={v => Number(v?.replace('%', '') || 35)}
                    />
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ marginBottom: 8 }}>
                    <Tooltip title="Qué porcentaje de tus pedidos se pagan contraentrega">
                      <Typography.Text style={{ fontSize: 12 }}>% pedidos contraentrega</Typography.Text>
                    </Tooltip>
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: '100%', marginTop: 4 }}
                      value={calcContraentregaPct}
                      onChange={v => setCalcContraentregaPct(v ?? 40)}
                      formatter={v => `${v}%`}
                      parser={v => Number(v?.replace('%', '') || 40)}
                    />
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <Checkbox checked={calcAbsorbShipping} onChange={e => setCalcAbsorbShipping(e.target.checked)}>
                  <Typography.Text style={{ fontSize: 12 }}>
                    Absorber envío
                    <span style={{ color: '#8c8c8c' }}> ({formatCurrency(avgShippingRate, 'COP')} promedio)</span>
                  </Typography.Text>
                </Checkbox>
                <Checkbox checked={calcAbsorbContraentrega} onChange={e => setCalcAbsorbContraentrega(e.target.checked)}>
                  <Typography.Text style={{ fontSize: 12 }}>
                    Absorber contraentrega
                    <span style={{ color: '#8c8c8c' }}> ({formatCurrency(contraentregaUnit, 'COP')} ponderado)</span>
                  </Typography.Text>
                </Checkbox>
              </div>

              <Divider style={{ margin: '10px 0' }} />

              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <div style={{ fontSize: 12, color: '#8c8c8c', lineHeight: 1.8 }}>
                    <div>Costo base: <strong style={{ color: '#262626' }}>{formatCurrency(calcCost, 'COP')}</strong></div>
                    <div>+ Envío:{' '}{calcAbsorbShipping ? <strong style={{ color: '#262626' }}>{formatCurrency(avgShippingRate, 'COP')}</strong> : <span style={{ color: '#52c41a' }}>cliente paga</span>}</div>
                    <div>+ Contraentrega:{' '}{calcAbsorbContraentrega ? <strong style={{ color: '#262626' }}>{formatCurrency(contraentregaUnit, 'COP')}</strong> : <span style={{ color: '#52c41a' }}>cliente paga</span>}</div>
                    {suggestedPrice > 0 && suggestedPrice < shippingConfig.freeShippingThreshold && (
                      <div style={{ color: '#fa8c16' }}>⚠ Queda bajo el umbral de envío gratis ({formatCurrency(shippingConfig.freeShippingThreshold, 'COP')})</div>
                    )}
                  </div>
                </Col>
                <Col>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>Precio mínimo sugerido</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#0A2A66' }}>
                      {suggestedPrice > 0 ? formatCurrency(suggestedPrice, 'COP') : '—'}
                    </div>
                    {suggestedPrice > 0 && (
                      <Button
                        size="small"
                        type="primary"
                        style={{ marginTop: 4 }}
                        onClick={() => {
                          form.setFieldsValue({ price: suggestedPrice, currency: 'COP' });
                          setCalcOpen(false);
                        }}
                      >
                        Usar este precio
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </div>

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
          <Col xs={24} md={6}>
            <Form.Item label="SKU (opcional)" name="sku">
              <Input placeholder="Ej: SKU-12345" />
            </Form.Item>
          </Col>

          <Col xs={24} md={6}>
            <Form.Item label="Marca / Brand (MeLi)" name="brand">
              <Input placeholder="Ej: Honda, Yamaha, Genérico" />
            </Form.Item>
          </Col>

          <Col xs={24} md={6}>
            <Form.Item label="Número en Diagrama (opcional)" name="diagramNumber">
              <Input placeholder="Ej: 14A" />
            </Form.Item>
          </Col>

          <Col xs={24} md={6}>
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


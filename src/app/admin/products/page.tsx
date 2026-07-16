'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  Alert,
  Statistic,
} from 'antd';
import {
  CalculatorOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  RobotOutlined,
  SearchOutlined,
  ClearOutlined,
  FileImageOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
  EyeOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import type { SkuLookupResult } from '@/app/api/admin/products/lookup-sku/route';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import type { MeliListing } from '@prisma/client';
import { productService, uploadImage } from '@/services/productService';
import { PRODUCT_CATEGORY_OPTIONS, getProductCategoryLabel } from '@/constants/productCategories';
import { formatCurrency } from '@/utils/formatCurrency';
import { DEFAULT_SHIPPING_CONFIG } from '@/config/shippingRates';
import type { ShippingConfig } from '@/config/shippingRates';
import { normalizeVideoUrl } from '@/lib/utils';

// --- Constantes y Opciones ---
const CATEGORY_OPTIONS = PRODUCT_CATEGORY_OPTIONS;
const CURRENCY_OPTIONS = ['USD', 'EUR', 'COP'];

// --- Componente Principal ---
export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // --- Estados ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
      const [videoUrlForm, setVideoUrlForm] = useState<string>('');
      const [isVideoUploading, setIsVideoUploading] = useState(false);
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
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // --- Generador de imágenes IA ---
  const [aiImgOpen, setAiImgOpen] = useState(false);
  const [aiImgPrompt, setAiImgPrompt] = useState('');
  const [aiImgResult, setAiImgResult] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  // --- Búsqueda inteligente por referencia ---
  const [skuLookupRef, setSkuLookupRef] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<SkuLookupResult | null>(null);

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

  /** Ratio del envío sobre el precio sugerido, en % */
  const shippingRatioOfPrice = useMemo(() => {
    if (!calcAbsorbShipping || suggestedPrice <= 0 || avgShippingRate <= 0) return 0;
    return Math.round((avgShippingRate / suggestedPrice) * 100);
  }, [calcAbsorbShipping, suggestedPrice, avgShippingRate]);

  /** Recomendación automática basada en la relación costo/envío */
  const calcRecommendation = useMemo((): { type: 'ok' | 'warn' | 'danger'; text: string } | null => {
    if (calcCost <= 0 || suggestedPrice <= 0) return null;
    if (!calcAbsorbShipping) return null;
    if (shippingRatioOfPrice >= 30) {
      return {
        type: 'danger',
        text: `El envío representa el ${shippingRatioOfPrice}% del precio final. Para productos económicos conviene NO absorber el envío — el cliente lo paga al checkout, igual que en MercadoLibre. Desmarca "Absorber envío" para obtener un precio más competitivo.`,
      };
    }
    if (shippingRatioOfPrice >= 20) {
      return {
        type: 'warn',
        text: `El envío representa el ${shippingRatioOfPrice}% del precio. Considera si vale la pena ofrecerlo gratis o cobrar envío por separado para mantener un precio más atractivo en la tarjeta.`,
      };
    }
    return null;
  }, [calcAbsorbShipping, shippingRatioOfPrice, calcCost, suggestedPrice]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesName = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesName && matchesCategory;
    });
  }, [products, searchText, categoryFilter]);

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
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('Error al obtener productos');
      const data = await res.json() as Product[];
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

   // Reset form when modal closes
   useEffect(() => {
     if (!modalOpen) {
       setEditingProduct(null);
       setFileList([]);
       setVideoUrlForm('');
       setAiImgOpen(false);
       setAiImgPrompt('');
       setAiImgResult(null);
       setSkuLookupRef('');
       setLookupResult(null);
       form.resetFields();
     }
   }, [modalOpen, form]);

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
      
            // 3.5 Usar la URL del video que ya se subió
                        const finalVideoUrl = videoUrlForm.trim() || null;

      // 4. Construir el payload final para la API
      const payload: Partial<Product> = {
        ...values,
        price: Number(values.price),
        stock: Number(values.stock ?? 0),
        category: values.category?.toLowerCase(),
        images: allImageUrls,
                imageUrl: allImageUrls[0], // La primera imagen como principal
                videoUrl: finalVideoUrl || null, // Guardamos la URL del video de Cloudinary
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
  const openModal = useCallback((product?: Product & { videoUrl?: string | null }) => {
      setEditingProduct(product || null);
      if (product) {
        form.setFieldsValue({ ...product });
        // Cargar costo en la calculadora si existe
        if (product.cost) {
          setCalcCost(product.cost);
        }
        const initialFileList = (product.images ?? []).map((url, index) => ({
          uid: `${-index - 1}`,
          name: `imagen-${index + 1}.jpg`,
          status: 'done' as const,
          url,
        }));
        setFileList(initialFileList);
      
        if (product.videoUrl) {
               setVideoUrlForm(product.videoUrl);
            } else {
               setVideoUrlForm('');
            }
          } else {
            form.resetFields();
            setFileList([]);
            setVideoUrlForm('');
            // Resetear calculadora para nuevo producto
            setCalcCost(0);
          }
    setAiImgOpen(false);
    setAiImgPrompt('');
    setAiImgResult(null);
    setSkuLookupRef('');
    setLookupResult(null);
    setModalOpen(true);
  }, [form]);

  // Auto-open edit modal when navigated from MeLi page with ?edit=<productId>
  useEffect(() => {
    if (loading || products.length === 0) return;
    const editId = searchParams.get('edit');
    if (!editId) return;
    const product = products.find((p) => p.id === editId);
    if (product) {
      openModal(product);
      router.replace('/admin/products');
    }
  }, [loading, products, searchParams, router, openModal]);

  const handleLookupSku = useCallback(async () => {
    const ref = skuLookupRef.trim() || (form.getFieldValue('sku') as string | undefined)?.trim();
    if (!ref) {
      message.warning('Ingresa un código de referencia para buscar.');
      return;
    }
    setIsLookingUp(true);
    setLookupResult(null);
    try {
      const res = await fetch('/api/admin/products/lookup-sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref }),
      });
      const data = await res.json() as SkuLookupResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al buscar');
      setLookupResult(data);
    } catch (err) {
      message.error((err as Error).message ?? 'Error al buscar referencia');
    } finally {
      setIsLookingUp(false);
    }
  }, [skuLookupRef, form]);

  const handleApplyLookup = useCallback(() => {
    if (!lookupResult) return;
    const patch: Record<string, unknown> = {};
    if (lookupResult.name) patch.name = lookupResult.name.toUpperCase();
    if (lookupResult.description) patch.description = lookupResult.description;
    if (lookupResult.category) patch.category = lookupResult.category;
    if (lookupResult.brand) patch.brand = lookupResult.brand;
    if (lookupResult.tags?.length) patch.tags = lookupResult.tags;
    if (lookupResult.sizes?.length) patch.sizes = lookupResult.sizes;
    if (lookupResult.diagramNumber) patch.diagramNumber = lookupResult.diagramNumber;
    if (skuLookupRef.trim()) patch.sku = skuLookupRef.trim();
    form.setFieldsValue(patch);
    setLookupResult(null);
    setSkuLookupRef('');
    message.success('Datos aplicados al formulario. Revisa y completa los faltantes.');
  }, [lookupResult, form, skuLookupRef]);

  const handleGenerateImage = useCallback(async () => {
    if (!aiImgPrompt.trim()) return;
    setIsGeneratingImg(true);
    try {
      const mainImageUrl = fileList[0]?.url;
      const res = await fetch('/api/admin/products/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiImgPrompt.trim(), mainImageUrl }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Error al generar imagen');
      setAiImgResult(data.url);
      message.success('Imagen generada con IA');
    } catch (err) {
      message.error((err as Error).message ?? 'Error al generar imagen');
    } finally {
      setIsGeneratingImg(false);
    }
  }, [aiImgPrompt, fileList]);

  const handleAddAiImage = useCallback(() => {
    if (!aiImgResult) return;
    if (fileList.length >= 5) {
      message.warning('Ya tienes el máximo de 5 imágenes.');
      return;
    }
    setFileList(prev => [
      ...prev,
      { uid: `ai-${Date.now()}`, name: `ai-${Date.now()}.png`, status: 'done' as const, url: aiImgResult },
    ]);
    setAiImgResult(null);
    setAiImgPrompt('');
    message.success('Imagen agregada al producto');
  }, [aiImgResult, fileList.length]);

  // --- Definición de Columnas para la Tabla ---
  // Renderizador inteligente de etiquetas (oculta excesos)
    const renderTags = (items: string[] | undefined, color: string = 'default') => {
      if (!items || items.length === 0) return null;
      const MAX_VISIBLE = 2;
      const visible = items.slice(0, MAX_VISIBLE);
      const hidden = items.slice(MAX_VISIBLE);

      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {visible.map((t) => <Tag key={t} color={color} style={{ margin: 0, fontSize: '11px' }}>{t.toUpperCase()}</Tag>)}
          {hidden.length > 0 && (
            <Tooltip title={<div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>{hidden.map(t => <Tag key={t} color={color} style={{ margin: 0 }}>{t}</Tag>)}</div>}>
              <Tag style={{ margin: 0, fontSize: '11px', cursor: 'help' }}>+{hidden.length} más</Tag>
            </Tooltip>
          )}
        </div>
      );
    };

    const columns: ColumnsType<Product> = useMemo(() => [
      {
        title: 'Producto',
        key: 'product',
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (_, record) => (
          <div 
            style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', maxWidth: '400px' }} 
            onClick={() => openModal(record)}
            title="Haga clic para editar"
            className="hover:bg-slate-50 transition-colors p-1 -m-1 rounded-lg"
          >
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <Image
                width={56}
                height={56}
                src={record.imageUrl || record.images?.[0]}
                alt={record.name}
                style={{ objectFit: 'cover', borderRadius: '8px', border: '1px solid #f0f0f0' }}
                fallback="/placeholder.png" 
                preview={false}
              />
              {record.videoUrl && (
                <div style={{ position: 'absolute', top: -4, right: -4, background: '#1890ff', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  ▶
                </div>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#0A2A66', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {record.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <Tag color="blue" style={{ margin: 0, fontSize: '10px', lineHeight: '18px', padding: '0 6px' }}>
                  {getProductCategoryLabel(record.category)}
                </Tag>
                {(record.sku || record.brand) && (
                  <span style={{ fontSize: '11px', color: '#8c8c8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {record.brand ? <strong style={{color: '#595959'}}>{record.brand}</strong> : ''}
                    {record.brand && record.sku ? ' · ' : ''}
                    {record.sku ? <span style={{fontFamily: 'monospace'}}>{record.sku}</span> : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Precio',
        dataIndex: 'price',
        key: 'price',
        sorter: (a, b) => a.price - b.price,
        render: (price: number, record) => (
          <span style={{ fontWeight: 600, color: '#262626' }}>
            {formatCurrency(price, record.currency ?? 'COP')}
          </span>
        ),
      },
      {
        title: 'Stock',
        dataIndex: 'stock',
        key: 'stock',
        sorter: (a, b) => (a.stock ?? 0) - (b.stock ?? 0),
        render: (stock: number) => {
          const s = stock ?? 0;
          const color = s === 0 ? '#cf1322' : s <= 5 ? '#d46b08' : '#389e0d';
          const bg    = s === 0 ? '#fff1f0' : s <= 5 ? '#fff7e6' : '#f6ffed';
          const border = s === 0 ? '#ffa39e' : s <= 5 ? '#ffd591' : '#b7eb8f';
          return (
            <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 12, padding: '2px 10px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
              {s === 0 ? 'Agotado' : s}
            </span>
          );
        },
      },
      {
        title: 'Compatibilidad & Etiquetas',
        key: 'tags_sizes',
        responsive: ['lg'], // Oculto en tablets/celulares
        width: '25%',
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {renderTags(record.sizes, 'processing')}
            {renderTags(record.tags, 'default')}
          </div>
        ),
      },
      {
        title: 'MeLi',
        key: 'meliExport',
        align: 'center',
        responsive: ['md'],
        render: (_, record) => {
          const hasMelItem = record.meliItemId && record.meliItemId.trim() !== '';
          const meliUrl = record.meliPermalink || (hasMelItem ? `https://articulo.mercadolibre.com.co/${record.meliItemId}` : null);
          
          return (
            <Space size="small">
              <Tooltip title={record.meliExport ? 'Exportar a MeLi: ON' : 'Exportar a MeLi: OFF'}>
                <Tag
                  color={record.meliExport ? 'green' : 'default'}
                  style={{ cursor: 'pointer', margin: 0, padding: '2px 8px' }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await productService.updateProduct(record.id, { meliExport: !record.meliExport });
                      await fetchProducts();
                      message.success(`MercadoLibre ${!record.meliExport ? 'activado' : 'desactivado'} para ${record.name}`);
                    } catch { message.error('Error al actualizar'); }
                  }}
                >
                  {record.meliExport ? 'ON' : 'OFF'}
                </Tag>
              </Tooltip>
              {meliUrl && (
                <Tooltip title="Ver detalles en Mercado Libre">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined style={{ color: '#1890ff' }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(meliUrl, '_blank', 'noopener,noreferrer');
                    }}
                  />
                </Tooltip>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Ventas',
        dataIndex: 'soldCount',
        key: 'sales',
        align: 'center',
        sorter: (a, b) => (a.soldCount ?? 0) - (b.soldCount ?? 0),
        render: (soldCount: number) => (
          <span style={{ fontWeight: 600, color: soldCount > 0 ? '#52c41a' : '#8c8c8c' }}>
            {soldCount ?? 0}
          </span>
        ),
      },
      {
        title: 'Acciones',
        key: 'actions',
        align: 'center',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#0A2A66' }} />}
              onClick={() => openModal(record)}
              title="Editar producto"
            />
            <Popconfirm
              title="¿Eliminar producto?"
              description="Esta acción no se puede deshacer."
              onConfirm={(e) => { e?.stopPropagation(); handleDeleteProduct(record.id); }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Sí, eliminar"
              cancelText="Cancelar"
            >
              <Button 
                 type="text" 
                 danger 
                 icon={<DeleteOutlined />} 
                 onClick={(e) => e.stopPropagation()} 
                 title="Eliminar producto"
              />
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

      {/* --- Stats row --- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#f0f5ff', border: '1px solid #adc6ff' }}>
            <Statistic
              title="Total productos"
              value={products.length}
              valueStyle={{ color: '#0A2A66', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
            <Statistic
              title="Ventas totales"
              value={products.reduce((sum, p) => sum + (p.soldCount ?? 0), 0)}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#fff7e6', border: '1px solid #ffd591' }}>
            <Statistic
              title="Stock bajo (≤ 5)"
              value={products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length}
              valueStyle={{ color: '#d46b08', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" style={{ borderRadius: 10, background: '#fff1f0', border: '1px solid #ffa39e' }}>
            <Statistic
              title="Sin stock"
              value={products.filter(p => (p.stock ?? 0) === 0).length}
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

    <Card>
      {/* --- Search & filter toolbar --- */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="Buscar por nombre..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="Filtrar por categoría"
          style={{ width: 210 }}
          value={categoryFilter || undefined}
          onChange={(v: string | undefined) => setCategoryFilter(v ?? '')}
          options={CATEGORY_OPTIONS}
        />
        {(searchText || categoryFilter) && (
          <Button
            icon={<ClearOutlined />}
            onClick={() => { setSearchText(''); setCategoryFilter(''); }}
          >
            Limpiar filtros
          </Button>
        )}
        <Typography.Text type="secondary" style={{ marginLeft: 'auto', fontSize: 13 }}>
          {filteredProducts.length === products.length
            ? `${products.length} productos`
            : `${filteredProducts.length} de ${products.length} productos`}
        </Typography.Text>
      </div>

      <Spin spinning={loading}>
        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showSizeChanger: true, responsive: true, showTotal: (total) => `${total} productos` }}
        />
      </Spin>
    </Card>

<Modal
       open={modalOpen}
       title={
         <Space>
           {editingProduct ? <EditOutlined style={{ color: '#0A2A66' }} /> : <PlusOutlined style={{ color: '#0A2A66' }} />}
           <span>{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</span>
         </Space>
       }
       onCancel={() => setModalOpen(false)}
       onOk={handleSaveProduct}
       confirmLoading={isSaving}
       okText={isSaving ? 'Guardando...' : 'Guardar producto'}
       cancelText="Cancelar"
       width="min(820px, 95vw)"
       forceRender
       destroyOnClose
       styles={{ body: { maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 } }}
     >
      <Form
        layout="vertical"
        form={form}
        name="product_form"
        initialValues={{ stock: 0, currency: 'COP' }}
      >

        {/* ══════════════════════════════════════════════════════════
             SECCIÓN 0 · BÚSQUEDA INTELIGENTE POR CÓDIGO/REFERENCIA
        ══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 20, padding: '14px 16px', background: 'linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%)', borderRadius: 10, border: '1px solid #d6e4ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ThunderboltOutlined style={{ color: '#722ed1', fontSize: 15 }} />
            <Typography.Text strong style={{ fontSize: 13, color: '#1d1d1d' }}>Búsqueda inteligente por referencia</Typography.Text>
            <Tag color="purple" style={{ fontSize: 11, marginLeft: 2 }}>IA</Tag>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
            Escribe el código OEM, SKU o nombre de referencia y la IA completará automáticamente los datos del producto.
          </Typography.Text>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Input
              size="large"
              placeholder="Ej: 13101-KVB-305, 90/90-17, AKT125 cilindro, FZ16 disco freno..."
              value={skuLookupRef}
              onChange={e => setSkuLookupRef(e.target.value)}
              onPressEnter={handleLookupSku}
              prefix={<SearchOutlined style={{ color: '#722ed1' }} />}
              allowClear
              style={{ flex: 1 }}
            />
            <Button
              size="large"
              type="primary"
              icon={<RobotOutlined />}
              loading={isLookingUp}
              onClick={handleLookupSku}
              style={{ background: '#722ed1', borderColor: '#722ed1', minWidth: 130 }}
            >
              {isLookingUp ? 'Buscando...' : 'Buscar con IA'}
            </Button>
          </div>

          {/* Resultado del lookup */}
          {lookupResult && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#fff', borderRadius: 8, border: `2px solid ${lookupResult.confidence === 'high' ? '#52c41a' : lookupResult.confidence === 'medium' ? '#faad14' : '#ff7875'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Space>
                  <CheckCircleOutlined style={{ color: lookupResult.confidence === 'high' ? '#52c41a' : lookupResult.confidence === 'medium' ? '#faad14' : '#ff7875' }} />
                  <Typography.Text strong style={{ fontSize: 13 }}>Resultado encontrado</Typography.Text>
                  <Tag color={lookupResult.confidence === 'high' ? 'success' : lookupResult.confidence === 'medium' ? 'warning' : 'error'}>
                    Confianza {lookupResult.confidence === 'high' ? 'alta' : lookupResult.confidence === 'medium' ? 'media' : 'baja'}
                  </Tag>
                </Space>
                <Button size="small" type="text" onClick={() => setLookupResult(null)}>✕</Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12, marginBottom: 10 }}>
                {lookupResult.name && <div><span style={{ color: '#8c8c8c' }}>Nombre:</span> <strong>{lookupResult.name}</strong></div>}
                {lookupResult.category && <div><span style={{ color: '#8c8c8c' }}>Categoría:</span> <strong>{getProductCategoryLabel(lookupResult.category)}</strong></div>}
                {lookupResult.brand && <div><span style={{ color: '#8c8c8c' }}>Marca:</span> <strong>{lookupResult.brand}</strong></div>}
                {lookupResult.sizes?.length ? <div><span style={{ color: '#8c8c8c' }}>Compatibilidad:</span> <strong>{lookupResult.sizes.join(', ')}</strong></div> : null}
                {lookupResult.tags?.length ? <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#8c8c8c' }}>Tags:</span> {lookupResult.tags.map(t => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>)}</div> : null}
                {lookupResult.description && <div style={{ gridColumn: '1 / -1', marginTop: 2 }}><span style={{ color: '#8c8c8c' }}>Descripción:</span> <span>{lookupResult.description}</span></div>}
              </div>

              {lookupResult.notes && (
                <Alert type="info" showIcon icon={<InfoCircleOutlined />} style={{ fontSize: 12, marginBottom: 8 }} message={lookupResult.notes} />
              )}

              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={handleApplyLookup}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  Aplicar datos al formulario
                </Button>
                <Button size="small" onClick={() => setLookupResult(null)}>Descartar</Button>
              </Space>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
             SECCIÓN 1 · INFORMACIÓN BÁSICA
        ══════════════════════════════════════════════════════════ */}
        <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c', borderColor: '#d9d9d9', margin: '0 0 14px' }}>
          <Space size={6}><BulbOutlined />Información básica</Space>
        </Divider>

        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item
              label="Nombre del Producto"
              name="name"
              rules={[{ required: true, message: 'El nombre es obligatorio' }]}
            >
              <Input size="large" placeholder="Ej: Cilindro AKT 125 STD, Llanta 90/90-17 Pirelli" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Marca / Brand" name="brand">
              <Input size="large" placeholder="Ej: Honda, Yamaha" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={
            <Space size={8}>
              <span>Descripción</span>
              <Button
                size="small"
                icon={<RobotOutlined />}
                loading={isGeneratingDesc}
                onClick={handleGenerateDescription}
                style={{ fontSize: 11, color: '#722ed1', borderColor: '#d3adf7' }}
              >
                Generar con IA
              </Button>
            </Space>
          }
          name="description"
          rules={[{ required: true, message: 'La descripción es obligatoria' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe el repuesto: uso, compatibilidad, materiales y recomendaciones de instalación."
          />
        </Form.Item>

        {/* ══════════════════════════════════════════════════════════
             SECCIÓN 2 · PRECIO Y STOCK
        ══════════════════════════════════════════════════════════ */}
        <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c', borderColor: '#d9d9d9', margin: '0 0 14px' }}>
          <Space size={6}><CalculatorOutlined />Precio y stock</Space>
        </Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Precio"
              name="price"
              rules={[{ required: true, message: 'El precio es obligatorio' }]}
            >
              <InputNumber<number>
                min={0}
                size="large"
                style={{ width: '100%' }}
                formatter={(value) => value ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                placeholder="Ej: 45.000"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Moneda" name="currency" rules={[{ required: true }]}>
              <Select
                size="large"
                options={CURRENCY_OPTIONS.map((c) => ({ value: c, label: c }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Stock" name="stock" rules={[{ required: true }]}>
              <InputNumber min={0} size="large" style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Costo base (COP)" name="cost">
              <InputNumber<number>
                min={0}
                size="large"
                style={{ width: '100%' }}
                formatter={(value) => value ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                parser={(value) => Number(value?.replace(/\$\s?|(,*)/g, '') || 0)}
                placeholder="Ej: 15.000 (opcional, para cálculo de precios MeLi)"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* --- Calculadora de precio mínimo --- */}
        <div style={{ marginBottom: 20 }}>
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

              {/* Alerta de recomendación inteligente */}
              {calcRecommendation && (
                <Alert
                  type={calcRecommendation.type === 'danger' ? 'error' : 'warning'}
                  showIcon
                  style={{ marginBottom: 10, fontSize: 12 }}
                  message={calcRecommendation.text}
                />
              )}

              <Row gutter={8} align="middle">
                <Col flex="auto">
                  <div style={{ fontSize: 12, color: '#8c8c8c', lineHeight: 1.8 }}>
                    <div>Costo base: <strong style={{ color: '#262626' }}>{formatCurrency(calcCost, 'COP')}</strong></div>
                    <div>+ Envío:{' '}{calcAbsorbShipping
                      ? <><strong style={{ color: '#262626' }}>{formatCurrency(avgShippingRate, 'COP')}</strong>{shippingRatioOfPrice > 0 && <span style={{ color: shippingRatioOfPrice >= 30 ? '#f5222d' : shippingRatioOfPrice >= 20 ? '#fa8c16' : '#52c41a', marginLeft: 4 }}>({shippingRatioOfPrice}% del precio)</span>}</>
                      : <span style={{ color: '#52c41a' }}>cliente paga</span>}
                    </div>
                    <div>+ Contraentrega:{' '}{calcAbsorbContraentrega ? <strong style={{ color: '#262626' }}>{formatCurrency(contraentregaUnit, 'COP')}</strong> : <span style={{ color: '#52c41a' }}>cliente paga</span>}</div>
                    {suggestedPrice > 0 && suggestedPrice >= shippingConfig.freeShippingThreshold && (
                      <div style={{ color: '#52c41a', fontWeight: 600 }}>✓ A este precio el comprador tiene envío gratis automático</div>
                    )}
                    {suggestedPrice > 0 && suggestedPrice < shippingConfig.freeShippingThreshold && (
                      <div style={{ color: '#fa8c16' }}>
                        ⚠ Precio bajo el umbral de envío gratis ({formatCurrency(shippingConfig.freeShippingThreshold, 'COP')})
                        {!calcAbsorbShipping && ' — el cliente paga el envío al checkout'}
                      </div>
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

        {/* ══════════════════════════════════════════════════════════
             SECCIÓN 3 · CLASIFICACIÓN Y REFERENCIAS
        ══════════════════════════════════════════════════════════ */}
        <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c', borderColor: '#d9d9d9', margin: '0 0 14px' }}>
          <Space size={6}><SearchOutlined />Clasificación y referencias</Space>
        </Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Categoría"
              name="category"
              rules={[{ required: true, message: 'La categoría es obligatoria' }]}
            >
              <Select
                size="large"
                options={CATEGORY_OPTIONS}
                placeholder="Selecciona una categoría"
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="SKU / Código OEM" name="sku">
              <Input
                size="large"
                placeholder="Ej: 13101-KVB-305"
                suffix={
                  <Tooltip title="Busca este código con IA para autocompletar">
                    <Button
                      size="small"
                      type="text"
                      icon={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
                      onClick={() => {
                        const sku = form.getFieldValue('sku') as string;
                        if (sku) { setSkuLookupRef(sku); }
                        // scroll to top of modal
                        document.querySelector('.ant-modal-body')?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </Tooltip>
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Etiquetas" name="tags">
              <Select size="large" mode="tags" allowClear placeholder="Ej: motor, filtro, desgaste" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Número en Diagrama" name="diagramNumber">
              <Input size="large" placeholder="Ej: 14A" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label="Exportar a MercadoLibre" name="meliExport" valuePropName="checked">
              <Checkbox style={{ marginTop: 8 }}>Activar exportación MeLi</Checkbox>
            </Form.Item>
          </Col>
        </Row>

        {/* ══════════════════════════════════════════════════════════
             SECCIÓN 4 · COMPATIBILIDAD
        ══════════════════════════════════════════════════════════ */}
        <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c', borderColor: '#d9d9d9', margin: '0 0 14px' }}>
          <Space size={6}><InfoCircleOutlined />Compatibilidad y atributos</Space>
        </Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Medidas / Modelos compatibles"
              tooltip="Ej: 90/90-17, AKT125, FZ16 — se muestran como filtros en la tienda"
              name="sizes"
            >
              <Select
                size="large"
                mode="tags"
                allowClear
                placeholder="Ej: 90/90-17, CG150, FZ16, AKT125"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Variantes / Colores"
              tooltip="Usado para variantes de color, terminado o especificación"
              name="colors"
            >
              <Select
                size="large"
                mode="tags"
                placeholder="Ej: Negro, Cromado, Estándar"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ══════════════════════════════════════════════════════════
             SECCIÓN 5 · IMÁGENES
        ══════════════════════════════════════════════════════════ */}
        <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c', borderColor: '#d9d9d9', margin: '0 0 14px' }}>
                  <Space size={6}><FileImageOutlined />Multimedia del producto</Space>
                </Divider>
        
                <Row gutter={16}>
                   <Col xs={24} md={12}>

                <Form.Item
          label={
            <Space size={6}>
              <span>Imágenes</span>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>(máx. 5 — la primera será la imagen principal)</Typography.Text>
            </Space>
          }
          required
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
                            <div className="mt-2">Subir Img</div>
                          </div>
                        )}
                      </Upload>
                    </Form.Item>
        
                    </Col>
                    <Col xs={24} md={12}>
                               <Form.Item 
                                 label={
                                   <Space size={6}>
                                     <span>Video del producto (Sube MP4)</span>
                                     <Typography.Text type="secondary" style={{ fontSize: 11 }}>(máx. 50MB)</Typography.Text>
                                   </Space>
                                 }
                               >
                                 <div className="space-y-3">
                                   <Upload
                                      accept="video/mp4,video/webm,video/quicktime"
                                      showUploadList={false}
                                      beforeUpload={async (file) => {
                                        setIsVideoUploading(true);
                                        message.loading({ content: 'Subiendo video a Cloudinary...', key: 'video-upload' });
                                        try {
                                          const videoRes = await uploadImage(file);
                                          setVideoUrlForm(videoRes.url);
                                          message.success({ content: '¡Video subido y procesado con éxito!', key: 'video-upload', duration: 3 });
                                        } catch {
                                                                                  message.error({ content: 'Error subiendo video. ¿Pesa más de 50MB?', key: 'video-upload', duration: 4 });
                                        } finally {
                                          setIsVideoUploading(false);
                                        }
                                        return false;
                                      }}
                                   >
                                     <Button icon={<VideoCameraOutlined />} loading={isVideoUploading} disabled={isVideoUploading}>
                                       {isVideoUploading ? 'Subiendo...' : 'Seleccionar y subir video'}
                                     </Button>
                                   </Upload>
               
{videoUrlForm && (
                                      <div className="mt-4 border border-slate-200 rounded-lg p-2 bg-slate-50 relative">
                                         <video 
                                           key={videoUrlForm}
                                           src={normalizeVideoUrl(videoUrlForm)}
                                           className="w-full max-h-48 object-cover rounded bg-black" 
                                           controls 
                                           controlsList="nodownload" 
                                           playsInline
                                         >
                                           Tu navegador no soporta video.
                                         </video>
                                         <Button 
                                            type="primary" danger size="small" 
                                            className="absolute top-3 right-3"
                                            icon={<DeleteOutlined />}
                                            onClick={() => setVideoUrlForm('')}
                                         >
                                           Quitar
                                         </Button>
                                         <div className="text-xs text-slate-400 mt-2 truncate">URL: {videoUrlForm}</div>
                                      </div>
                                    )}
                                 </div>
                               </Form.Item>
                            </Col>
                    </Row>

                    {/* --- Generador de variantes con IA --- */}
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <Button
            type="link"
            icon={<RobotOutlined style={{ color: '#722ed1' }} />}
            style={{ padding: 0, fontSize: 13, color: '#722ed1' }}
            onClick={() => setAiImgOpen(o => !o)}
          >
            {aiImgOpen ? 'Ocultar generador de imágenes IA' : '✨ Generar variante de imagen con IA'}
          </Button>

          {aiImgOpen && (
            <div style={{ marginTop: 10, padding: '14px 16px', background: '#f9f0ff', borderRadius: 8, border: '1px solid #d3adf7' }}>
              <Space style={{ marginBottom: 6 }}>
                <RobotOutlined style={{ color: '#722ed1' }} />
                <Typography.Text strong style={{ fontSize: 13 }}>Generador de imágenes con IA</Typography.Text>
                <Tag color="purple" style={{ fontSize: 11 }}>Gemini Vision</Tag>
              </Space>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 10px' }}>
                {fileList.length > 0
                  ? '✓ Se usará la imagen subida como referencia — la IA generará una variante fiel al producto.'
                  : 'Describe el producto y la IA generará una imagen de estudio para e-commerce.'}
              </Typography.Paragraph>

              <Input.TextArea
                rows={3}
                placeholder="Ej: mismo producto sobre fondo blanco, iluminación de estudio, vista lateral derecha"
                value={aiImgPrompt}
                onChange={e => setAiImgPrompt(e.target.value)}
                style={{ marginBottom: 10 }}
              />

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  type="primary"
                  icon={<FileImageOutlined />}
                  loading={isGeneratingImg}
                  disabled={!aiImgPrompt.trim() || fileList.length >= 5}
                  onClick={handleGenerateImage}
                  style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                  {isGeneratingImg ? 'Generando...' : 'Generar imagen'}
                </Button>
                {fileList.length > 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    ✓ Se usará la imagen principal como referencia
                  </Typography.Text>
                )}
                {fileList.length >= 5 && (
                  <Typography.Text type="warning" style={{ fontSize: 12 }}>
                    Máximo de imágenes alcanzado (5)
                  </Typography.Text>
                )}
              </div>

              {aiImgResult && (
                <div style={{ marginTop: 14, padding: '10px 12px', background: '#fff', borderRadius: 8, border: '1px solid #d3adf7', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <Image
                    src={aiImgResult}
                    width={110}
                    height={110}
                    style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
                    alt="Imagen generada por IA"
                  />
                  <div style={{ flex: 1 }}>
                    <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                      Imagen generada
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                      Revisa el resultado. Puedes agregarla directamente al producto o descartarla y generar una nueva.
                    </Typography.Text>
                    <Space>
                      <Button size="small" type="primary" onClick={handleAddAiImage} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
                        Agregar al producto
                      </Button>
                      <Button size="small" onClick={() => { setAiImgResult(null); }}>
                        Descartar
                      </Button>
                    </Space>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Form>
    </Modal>
  </div>
);
}

// Puedes añadir otros datos del token aquí si los necesitas


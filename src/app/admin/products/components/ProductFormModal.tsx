// src/app/admin/products/components/ProductFormModal.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Package,
  Sparkles,
  DollarSign,
  Layers,
  Video,
  Image as ImageIcon,
  Wand2,
  Check,
  ExternalLink,
  AlertTriangle,
  Search,
  Trash2,
  Copy,
  Plus,
  Eye,
  Truck,
  Info,
  ShoppingCart,
  Loader2,
  Tag,
  CheckCircle2,
  Store,
  ChevronRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { message } from 'antd';
import type { Product } from '@/types/product';
import {
  PRODUCT_CATEGORY_OPTIONS,
  getProductCategoryLabel,
  isProductCategory,
} from '@/constants/productCategories';
import { formatCurrency } from '@/utils/formatCurrency';
import { uploadImage } from '@/services/productService';

interface SkuLookupResult {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  tags?: string[];
  sizes?: string[];
  diagramNumber?: string;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
}

interface ShippingConfig {
  freeShippingAll: boolean;
  freeShippingThreshold: number;
  defaultRate: number;
  regions: Array<{ region: string; baseRate: number }>;
  contraentregaSurcharge: number;
}

const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  freeShippingAll: false,
  freeShippingThreshold: 140000,
  defaultRate: 15000,
  regions: [
    { region: 'Eje Cafetero', baseRate: 10000 },
    { region: 'Ciudades Principales', baseRate: 14000 },
    { region: 'Resto del País', baseRate: 18000 },
  ],
  contraentregaSurcharge: 12000,
};

type ActiveTab = 'general' | 'pricing' | 'media' | 'compatibility' | 'meli';

interface ProductFormModalProps {
  open: boolean;
  product: (Product & { videoUrl?: string | null }) | null;
  onClose: () => void;
  onSave: (payload: Partial<Product>) => Promise<void>;
  isSaving: boolean;
  isIframe?: boolean;
}

function normalizeVideoUrl(url: string): string {
  if (!url) return '';
  if (url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/video/upload/');
  }
  return url;
}

export default function ProductFormModal({
  open,
  product,
  onClose,
  onSave,
  isSaving,
  isIframe = false,
}: ProductFormModalProps) {
  const isEditing = Boolean(product);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');

  // Form Field States
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<string>('cilindros');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [diagramNumber, setDiagramNumber] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'EUR'>('COP');

  // Tags and Lists
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Input states for chips
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newTag, setNewTag] = useState('');

  // Media
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // MercadoLibre
  const [meliExport, setMeliExport] = useState(false);

  // AI & SKU Lookup
  const [skuLookupRef, setSkuLookupRef] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<SkuLookupResult | null>(null);
  const [isLookupExpanded, setIsLookupExpanded] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // AI Image generation
  const [aiImgOpen, setAiImgOpen] = useState(false);
  const [aiImgPrompt, setAiImgPrompt] = useState('');
  const [aiImgResult, setAiImgResult] = useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  // Calculator states
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [calcMargin, setCalcMargin] = useState<number>(35);
  const [calcContraentregaPct, setCalcContraentregaPct] = useState<number>(40);
  const [calcAbsorbShipping, setCalcAbsorbShipping] = useState(true);
  const [calcAbsorbContraentrega, setCalcAbsorbContraentrega] = useState(true);
  const [showCalc, setShowCalc] = useState(false);

  // Live Preview Preview Image
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  // Load Shipping Rules
  useEffect(() => {
    fetch('/api/store-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.shippingRules) setShippingConfig(data.shippingRules as ShippingConfig);
      })
      .catch(() => {});
  }, []);

  // Initialize or reset form values
  useEffect(() => {
    if (!open) return;

    if (product) {
      setName(product.name || '');
      setBrand(product.brand || '');
      setCategory(product.category || 'cilindros');
      setDescription(product.description || '');
      setSku(product.sku || '');
      setDiagramNumber(product.diagramNumber || '');
      setPrice(Number(product.price) || 0);
      setCost(Number((product as unknown as { cost?: number }).cost) || 0);
      setStock(product.stock ?? 0);
      setCurrency(product.currency || 'COP');

      setSizes(Array.isArray(product.sizes) ? product.sizes : []);
      setColors(Array.isArray(product.colors) ? product.colors : []);
      setTags(Array.isArray(product.tags) ? product.tags : []);

      const existingImages = product.images?.length
        ? product.images
        : product.imageUrl
        ? [product.imageUrl]
        : [];
      setImages(existingImages);
      setVideoUrl(product.videoUrl || '');
      setMeliExport(Boolean(product.meliExport));
    } else {
      // New product defaults
      setName('');
      setBrand('');
      setCategory('cilindros');
      setDescription('');
      setSku('');
      setDiagramNumber('');
      setPrice(0);
      setCost(0);
      setStock(1);
      setCurrency('COP');
      setSizes([]);
      setColors([]);
      setTags([]);
      setImages([]);
      setVideoUrl('');
      setMeliExport(false);
    }

    setActiveTab('general');
    setLookupResult(null);
    setSkuLookupRef('');
    setIsLookupExpanded(false);
    setAiImgResult(null);
    setAiImgPrompt('');
    setAiImgOpen(false);
    setPreviewImageIndex(0);
  }, [open, product]);

  // Pricing Calculator computations
  const avgShippingRate = useMemo(() => {
    if (shippingConfig.freeShippingAll) return 0;
    const rates = shippingConfig.regions.map((r) => r.baseRate);
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [shippingConfig]);

  const contraentregaUnit = useMemo(() => {
    return Math.round((calcContraentregaPct / 100) * shippingConfig.contraentregaSurcharge);
  }, [calcContraentregaPct, shippingConfig.contraentregaSurcharge]);

  const suggestedPrice = useMemo(() => {
    if (cost <= 0 || calcMargin >= 100) return 0;
    const shippingCost = calcAbsorbShipping ? avgShippingRate : 0;
    const contraentregaCost = calcAbsorbContraentrega ? contraentregaUnit : 0;
    const totalCost = cost + shippingCost + contraentregaCost;
    return Math.ceil(totalCost / (1 - calcMargin / 100) / 100) * 100;
  }, [cost, calcMargin, calcAbsorbShipping, calcAbsorbContraentrega, avgShippingRate, contraentregaUnit]);

  // Shipping ratio of price
  const shippingRatioOfPrice = useMemo(() => {
    if (!calcAbsorbShipping || suggestedPrice <= 0 || avgShippingRate <= 0) return 0;
    return Math.round((avgShippingRate / suggestedPrice) * 100);
  }, [calcAbsorbShipping, suggestedPrice, avgShippingRate]);

  // Estimated Gross Margin
  const currentMarginAmount = Math.max(0, price - cost);
  const currentMarginPercent = price > 0 ? Math.round((currentMarginAmount / price) * 100) : 0;

  // SKU Lookup
  const handleLookupSku = async () => {
    const ref = skuLookupRef.trim() || sku.trim();
    if (!ref) {
      message.warning('Ingresa un código OEM o referencia para buscar con IA');
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
      const data = (await res.json()) as SkuLookupResult & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Error al buscar referencia');
      setLookupResult(data);
      setIsLookupExpanded(true);
    } catch (err) {
      message.error((err as Error).message || 'Error al buscar referencia');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleApplyLookup = () => {
    if (!lookupResult) return;
    if (lookupResult.name) setName(lookupResult.name.toUpperCase());
    if (lookupResult.description) setDescription(lookupResult.description);
    if (lookupResult.category && isProductCategory(lookupResult.category)) {
      setCategory(lookupResult.category);
    }
    if (lookupResult.brand) setBrand(lookupResult.brand);
    if (lookupResult.tags?.length) setTags(lookupResult.tags);
    if (lookupResult.sizes?.length) setSizes(lookupResult.sizes);
    if (lookupResult.diagramNumber) setDiagramNumber(lookupResult.diagramNumber);
    if (skuLookupRef.trim()) setSku(skuLookupRef.trim());

    setLookupResult(null);
    setIsLookupExpanded(false);
    message.success('Datos aplicados automáticamente al formulario ✨');
  };

  // AI Description Generation
  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      message.warning('Primero escribe el nombre del producto.');
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const res = await fetch('/api/admin/products/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          brand,
          sku,
          tags,
        }),
      });
      const data = (await res.json()) as { description?: string; error?: string };
      if (!res.ok || !data.description) throw new Error(data.error || 'Error al generar descripción');
      setDescription(data.description);
      message.success('Descripción persuasiva generada con IA ✨');
    } catch (err) {
      message.error((err as Error).message || 'Error al generar descripción');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  // Image Upload
  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      message.warning('El máximo permitido es de 5 imágenes por producto.');
    }

    setIsUploadingImage(true);
    try {
      const remainingSlots = Math.max(0, 5 - images.length);
      const toUpload = Array.from(files).slice(0, remainingSlots);

      const results = await Promise.all(toUpload.map((f) => uploadImage(f)));
      const newUrls = results.map((r) => r.url).filter(Boolean);

      setImages((prev) => [...prev, ...newUrls]);
      message.success(`${newUrls.length} imagen(es) subida(s) correctamente`);
    } catch {
      message.error('Error al subir una o más imágenes');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
    setPreviewImageIndex(0);
    message.info('Imagen establecida como portada principal');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (previewImageIndex >= index && previewImageIndex > 0) {
      setPreviewImageIndex((p) => p - 1);
    }
  };

  // Video Upload
  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 52428800) {
      message.error('El video supera el límite de 50MB');
      return;
    }

    setIsUploadingVideo(true);
    const key = 'video-up';
    message.loading({ content: 'Subiendo video a Cloudinary...', key });

    try {
      const res = await uploadImage(file);
      setVideoUrl(res.url);
      message.success({ content: '¡Video subido y procesado con éxito!', key });
    } catch {
      message.error({ content: 'Error al subir video. Revisa el formato y tamaño.', key });
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // AI Image Variant Generation
  const handleGenerateImage = async () => {
    if (!aiImgPrompt.trim()) return;
    setIsGeneratingImg(true);
    try {
      const mainImageUrl = images[0];
      const res = await fetch('/api/admin/products/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiImgPrompt.trim(), mainImageUrl }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Error al generar imagen');
      setAiImgResult(data.url);
      message.success('Imagen generada con IA');
    } catch (err) {
      message.error((err as Error).message || 'Error al generar imagen');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleAddAiImage = () => {
    if (!aiImgResult) return;
    if (images.length >= 5) {
      message.warning('Máximo de 5 imágenes alcanzado');
      return;
    }
    setImages((prev) => [...prev, aiImgResult]);
    setAiImgResult(null);
    setAiImgPrompt('');
    setAiImgOpen(false);
    message.success('Imagen agregada al producto');
  };

  // Chips Handlers
  const handleAddSize = () => {
    if (!newSize.trim()) return;
    if (!sizes.includes(newSize.trim())) {
      setSizes((prev) => [...prev, newSize.trim()]);
    }
    setNewSize('');
  };

  const handleAddColor = () => {
    if (!newColor.trim()) return;
    if (!colors.includes(newColor.trim())) {
      setColors((prev) => [...prev, newColor.trim()]);
    }
    setNewColor('');
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()]);
    }
    setNewTag('');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setActiveTab('general');
      message.error('El nombre del producto es obligatorio');
      return;
    }

    if (!description.trim()) {
      setActiveTab('general');
      message.error('La descripción del producto es obligatoria');
      return;
    }

    if (price <= 0) {
      setActiveTab('pricing');
      message.error('El precio debe ser mayor a $0 COP');
      return;
    }

    if (!isEditing && images.length === 0) {
      setActiveTab('media');
      message.error('Un producto nuevo debe tener al menos una imagen');
      return;
    }

    const payload: Partial<Product> = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: category.toLowerCase() as Product['category'],
      description: description.trim(),
      sku: sku.trim() || undefined,
      diagramNumber: diagramNumber.trim() || undefined,
      price: Number(price),
      cost: cost > 0 ? Number(cost) : undefined,
      stock: Number(stock ?? 0),
      currency,
      images,
      imageUrl: images[0] || undefined,
      videoUrl: videoUrl.trim() || null,
      sizes,
      colors,
      tags,
      meliExport,
    };

    try {
      await onSave(payload);
      if (typeof window !== 'undefined' && isIframe) {
        window.parent.postMessage({ type: 'PRODUCT_SAVED' }, '*');
      }
    } catch (err) {
      message.error((err as Error).message || 'Error al guardar producto');
    }
  };

  const handleCancel = () => {
    onClose();
    if (typeof window !== 'undefined' && isIframe) {
      window.parent.postMessage({ type: 'PRODUCT_CANCELLED' }, '*');
    }
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isIframe ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      } bg-black/85 backdrop-blur-md overflow-y-auto`}
    >
      <div
        className={`relative w-full ${
          isIframe ? 'h-full max-w-none rounded-none' : 'max-w-6xl max-h-[94vh] rounded-3xl'
        } flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800/90 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-0.5 shadow-md shadow-sky-500/20 shrink-0">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Package className="w-5 h-5 text-sky-400" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white truncate">
                  {isEditing ? `Editar: ${product?.name || 'Producto'}` : 'Crear Nuevo Producto'}
                </h2>
                {isEditing && product?.sku && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    SKU: {product.sku}
                  </span>
                )}
                {meliExport && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    MERCADO LIBRE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {isEditing
                  ? `ID: ${product?.id} • Actualiza especificaciones, precios y multimedia`
                  : 'Registra un repuesto con inventario, cálculo de margen y sincronización'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && product?.id && (
              <a
                href={`/products/${product.slug || product.id}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
                title="Ver producto en la tienda pública"
              >
                <Store className="w-3.5 h-3.5 text-sky-400" />
                <span>Ver en Tienda</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleCancel}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>1. Información General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>2. Precios & Margen</span>
            {price > 0 && (
              <span className="text-[10px] font-mono opacity-80 font-normal">
                ({formatCurrency(price, 'COP')})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'media'
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>3. Fotos & Video</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                images.length > 0 ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {images.length}/5
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compatibility')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'compatibility'
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. Compatibilidad & Variantes</span>
            {sizes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
                {sizes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meli')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'meli'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>5. Mercado Libre</span>
            {meliExport && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          </button>
        </div>

        {/* Modal Main Content: Left Form + Right Live Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 scrollbar-thin">
          {/* LEFT: THE INTERACTIVE FORM (7 cols on lg) */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 flex flex-col gap-5 justify-between"
          >
            {/* ═══ TAB 1: INFORMACIÓN GENERAL ═══ */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* AI SKU Lookup Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-950 border border-purple-500/30 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">
                        Búsqueda Inteligente por Referencia / OEM
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        IA GEMINI
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsLookupExpanded(!isLookupExpanded)}
                      className="text-[11px] font-semibold text-purple-300 hover:text-white transition-colors"
                    >
                      {isLookupExpanded ? 'Ocultar' : 'Usar Asistente'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3">
                    Ingresa el código de fábrica (ej: 13101-KVB-305, 90/90-17, cilindro AKT 125) y la IA autocompletará título, categoría, marca y compatibilidad.
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={skuLookupRef}
                        onChange={(e) => setSkuLookupRef(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLookupSku();
                          }
                        }}
                        placeholder="Ej: 13101-KVB-305, Llanta 90/90-17, FZ16 disco freno..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleLookupSku}
                      disabled={isLookingUp}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all disabled:opacity-50 shrink-0"
                    >
                      {isLookingUp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isLookingUp ? 'Buscando...' : 'Buscar con IA'}</span>
                    </button>
                  </div>

                  {/* Lookup Result Box */}
                  {lookupResult && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/40 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Resultado Encontrado ({lookupResult.confidence || 'alta'} confianza)
                        </span>
                        <button
                          type="button"
                          onClick={() => setLookupResult(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                        {lookupResult.name && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Nombre sugerido:</span>{' '}
                            <strong className="text-white">{lookupResult.name}</strong>
                          </div>
                        )}
                        {lookupResult.brand && (
                          <div>
                            <span className="text-slate-500">Marca:</span> {lookupResult.brand}
                          </div>
                        )}
                        {lookupResult.category && (
                          <div>
                            <span className="text-slate-500">Categoría:</span>{' '}
                            {getProductCategoryLabel(lookupResult.category)}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyLookup}
                        className="w-full mt-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aplicar estos datos al formulario</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Fields: Name & Brand */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nombre del Producto <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Cilindro AKT 125 STD Completo con Pistón y Anillos"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Marca / Fabricante
                      </label>
                      <input
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Ej: Honda, Yamaha, AKT, Auteco, Revo"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Categoría Principal <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50 cursor-pointer"
                        required
                      >
                        {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        SKU / Código OEM
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Ej: 13101-KVB-305"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Número en Diagrama / Despiece
                      </label>
                      <input
                        type="text"
                        value={diagramNumber}
                        onChange={(e) => setDiagramNumber(e.target.value)}
                        placeholder="Ej: 14A, E-05"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>
                  </div>

                  {/* Description with AI copywriter */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Descripción Comercial <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateDescription}
                        disabled={isGeneratingDesc}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {isGeneratingDesc ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isGeneratingDesc ? 'Redactando...' : '✨ Redactar con IA'}</span>
                      </button>
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe el repuesto: materiales, especificaciones técnicas, compatibilidad y tips de instalación..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB 2: PRECIOS & MARGEN ═══ */}
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Fijación de Precios & Inventario</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCalc(!showCalc)}
                      className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold"
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>{showCalc ? 'Ocultar Calculadora' : 'Calculadora de Margen'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Precio de Venta <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        required
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Visible en tienda al cliente
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Costo Base (COP)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cost}
                        onChange={(e) => setCost(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Tu costo de compra/proveedor
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Stock Disponible <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        required
                      />
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => setStock(0)}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            stock === 0 ? 'bg-red-500/20 text-red-300 font-bold' : 'text-slate-500'
                          }`}
                        >
                          Agotado
                        </button>
                        <button
                          type="button"
                          onClick={() => setStock(3)}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            stock > 0 && stock <= 5
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'text-slate-500'
                          }`}
                        >
                          Bajo (3)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStock(10)}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            stock >= 10 ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-500'
                          }`}
                        >
                          Normal (10)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Profit summary card */}
                  {cost > 0 && price > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Ganancia Bruta Estimada:</span>
                        <span className="font-bold text-white font-mono ml-2">
                          {formatCurrency(currentMarginAmount, 'COP')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Margen Bruto:</span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold font-mono ${
                            currentMarginPercent >= 30
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : currentMarginPercent >= 15
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {currentMarginPercent}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Calculadora Interactiva de Precio */}
                  {showCalc && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 space-y-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Percent className="w-4 h-4 text-sky-400" />
                          Simulador de Precio Mínimo Sugerido
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">
                            Margen Neto Deseado (%)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="90"
                            value={calcMargin}
                            onChange={(e) => setCalcMargin(Number(e.target.value))}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 mb-1 block">
                            % Pedidos Contraentrega ({calcContraentregaPct}%)
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={calcContraentregaPct}
                            onChange={(e) => setCalcContraentregaPct(Number(e.target.value))}
                            className="w-full accent-sky-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap text-slate-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={calcAbsorbShipping}
                            onChange={(e) => setCalcAbsorbShipping(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-950 border-slate-700"
                          />
                          <span>
                            Absorber Flete Promedio ({formatCurrency(avgShippingRate, 'COP')})
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={calcAbsorbContraentrega}
                            onChange={(e) => setCalcAbsorbContraentrega(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-950 border-slate-700"
                          />
                          <span>
                            Absorber Contraentrega ({formatCurrency(contraentregaUnit, 'COP')})
                          </span>
                        </label>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 text-[11px] block">
                            Precio Sugerido para cubrir costos y ganar {calcMargin}%:
                          </span>
                          <span className="text-xl font-black text-sky-400 font-mono">
                            {suggestedPrice > 0 ? formatCurrency(suggestedPrice, 'COP') : '—'}
                          </span>
                        </div>

                        {suggestedPrice > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPrice(suggestedPrice);
                              setShowCalc(false);
                              message.success('Precio sugerido aplicado');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all"
                          >
                            Usar este precio
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ TAB 3: FOTOS & VIDEO ═══ */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                {/* Images Section */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-sky-400" />
                        Galería de Imágenes ({images.length}/5)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        La primera imagen es la portada en catálogo. Haz clic en &quot;Portada&quot; en cualquier foto para moverla al primer lugar.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAiImgOpen(!aiImgOpen)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiImgOpen ? 'Cerrar IA' : '✨ Generar con IA'}</span>
                    </button>
                  </div>

                  {/* AI Image Generation Sub-Panel */}
                  {aiImgOpen && (
                    <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-200">
                          Generador de Variantes Fotográficas con IA (Gemini Vision)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Describe el fondo o estilo que deseas (ej: &quot;fondo blanco limpio de estudio e-commerce, iluminación profesional&quot;):
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={aiImgPrompt}
                          onChange={(e) => setAiImgPrompt(e.target.value)}
                          placeholder="Mismo producto sobre fondo blanco, iluminación de estudio..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/40 text-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImg || !aiImgPrompt.trim()}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow disabled:opacity-50 shrink-0 flex items-center gap-1"
                        >
                          {isGeneratingImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          <span>{isGeneratingImg ? 'Generando...' : 'Generar'}</span>
                        </button>
                      </div>

                      {aiImgResult && (
                        <div className="flex items-center gap-3 pt-2">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-purple-500 shrink-0">
                            <Image src={aiImgResult} alt="Resultado IA" fill className="object-cover" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] text-emerald-400 font-bold block">
                              ✓ Imagen generada con éxito
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleAddAiImage}
                                className="px-2.5 py-1 rounded bg-purple-600 text-white text-[11px] font-bold"
                              >
                                Añadir a mis fotos
                              </button>
                              <button
                                type="button"
                                onClick={() => setAiImgResult(null)}
                                className="text-[11px] text-slate-400 hover:text-white"
                              >
                                Descartar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Images Thumbnails Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    {images.map((url, idx) => (
                      <div
                        key={idx}
                        className={`group relative h-28 rounded-2xl overflow-hidden border transition-all ${
                          idx === 0
                            ? 'ring-2 ring-sky-400 border-transparent shadow-lg shadow-sky-500/10'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <Image
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top badge */}
                        <div className="absolute top-1.5 left-1.5 z-10">
                          {idx === 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-sky-500 text-white shadow">
                              PORTADA
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 hover:bg-sky-600 text-slate-300 hover:text-white backdrop-blur-sm transition-colors"
                            >
                              Hacer Portada
                            </button>
                          )}
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Upload Card */}
                    {images.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="h-28 rounded-2xl border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-sky-400 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {isUploadingImage ? (
                          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                        ) : (
                          <Plus className="w-6 h-6" />
                        )}
                        <span>{isUploadingImage ? 'Subiendo...' : 'Subir Imagen'}</span>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFiles}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Video MP4 Section */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-400" />
                        Video Demostrativo del Repuesto (MP4)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sube un video corto de demostración o funcionamiento (máx. 50MB).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploadingVideo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
                    >
                      {isUploadingVideo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Video className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingVideo ? 'Subiendo video...' : 'Subir Video'}</span>
                    </button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleVideoFile}
                      className="hidden"
                    />
                  </div>

                  {videoUrl ? (
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 p-2">
                      <video
                        src={normalizeVideoUrl(videoUrl)}
                        className="w-full max-h-48 object-cover rounded-xl"
                        controls
                        playsInline
                      />
                      <button
                        type="button"
                        onClick={() => setVideoUrl('')}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
                      >
                        Eliminar Video
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                      No hay video cargado para este producto aún.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ TAB 4: COMPATIBILIDAD & VARIANTES ═══ */}
            {activeTab === 'compatibility' && (
              <div className="space-y-4">
                {/* Compatible Models / Sizes */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400" />
                      Modelos de Moto Compatibles / Medidas
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Filtros clave que usan los moteros para encontrar repuestos para su moto (ej: AKT 125, FZ 16, 90/90-17).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSize();
                        }
                      }}
                      placeholder="Escribe un modelo o medida (ej: AKT 125) y presiona Enter..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shrink-0"
                    >
                      Añadir
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sizes.map((s, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-950/80 border border-sky-800/60 text-sky-300"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => setSizes((prev) => prev.filter((_, i) => i !== idx))}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {sizes.length === 0 && (
                      <span className="text-[11px] text-slate-500 italic">
                        No hay modelos añadidos
                      </span>
                    )}
                  </div>
                </div>

                {/* Colors / Finishes */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-400" />
                      Variantes de Color / Terminado
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Opciones disponibles (ej: Negro Mate, Cromado, Titanio, Estándar).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColor();
                        }
                      }}
                      placeholder="Ej: Negro Mate, Cromado..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddColor}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shrink-0"
                    >
                      Añadir
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {colors.map((c, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950/80 border border-purple-800/60 text-purple-300"
                      >
                        <span>{c}</span>
                        <button
                          type="button"
                          onClick={() => setColors((prev) => prev.filter((_, i) => i !== idx))}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {colors.length === 0 && (
                      <span className="text-[11px] text-slate-500 italic">
                        Sin variantes de color especificadas
                      </span>
                    )}
                  </div>
                </div>

                {/* Search Tags */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Search className="w-4 h-4 text-emerald-400" />
                      Etiquetas de Búsqueda (Tags)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Palabras clave para el buscador interno de la tienda (ej: freno, desgaste, original).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Escribe etiqueta..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0"
                    >
                      Añadir
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/80 border border-emerald-800/60 text-emerald-300"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((_, i) => i !== idx))}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TAB 5: MERCADO LIBRE ═══ */}
            {activeTab === 'meli' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        ML
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          Sincronización con Mercado Libre
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Exporta automáticamente este producto al catálogo oficial de Mercado Libre.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMeliExport(!meliExport)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        meliExport ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                          meliExport ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {product?.meliItemId ? (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ID en Mercado Libre:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {product.meliItemId}
                        </span>
                      </div>
                      {product.meliPermalink && (
                        <div className="pt-2 border-t border-slate-800 flex justify-end">
                          <a
                            href={product.meliPermalink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-semibold"
                          >
                            <span>Ver publicación oficial en Mercado Libre</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : meliExport ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>
                        Al guardar, este producto quedará habilitado para exportarse a Mercado Libre en el módulo de sincronización.
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 mt-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                {activeTab !== 'general' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs: ActiveTab[] = ['general', 'pricing', 'media', 'compatibility', 'meli'];
                      const currIdx = tabs.indexOf(activeTab);
                      if (currIdx > 0) setActiveTab(tabs[currIdx - 1]);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Anterior
                  </button>
                )}

                {activeTab !== 'meli' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const tabs: ActiveTab[] = ['general', 'pricing', 'media', 'compatibility', 'meli'];
                      const currIdx = tabs.indexOf(activeTab);
                      if (currIdx < tabs.length - 1) setActiveTab(tabs[currIdx + 1]);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving
                      ? 'Guardando...'
                      : isEditing
                      ? 'Guardar Cambios'
                      : 'Crear Producto'}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* RIGHT: LIVE STORE PREVIEW (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="sticky top-0 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Eye className="w-4 h-4" />
                  Vista Previa en Tienda (En Vivo)
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-mono">
                  {stock > 0 ? `${stock} disponibles` : 'Sin stock'}
                </span>
              </div>

              {/* Simulated Customer Product Card */}
              <div className="rounded-3xl bg-slate-950 p-4 border border-slate-800/90 shadow-2xl">
                <div className="relative flex flex-col bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                  {/* Photo area with mini thumbnails */}
                  <div className="relative h-56 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    {images.length > 0 ? (
                      <Image
                        src={images[previewImageIndex] || images[0]}
                        alt={name || 'Producto'}
                        fill
                        className="object-cover transition-all duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600">
                        <ImageIcon className="w-12 h-12 opacity-40 mb-1" />
                        <span className="text-xs">Sin imagen aún</span>
                      </div>
                    )}

                    {/* Category and Brand Badges */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0A2A66]/90 text-sky-300 backdrop-blur-sm border border-sky-400/30 uppercase tracking-wide">
                        {getProductCategoryLabel(category)}
                      </span>
                      {brand && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/60 text-slate-300 backdrop-blur-sm">
                          {brand.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Stock badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md ${
                          stock <= 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : stock <= 5
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {stock <= 0 ? 'Agotado' : stock <= 5 ? `¡Solo ${stock}!` : 'En Stock'}
                      </span>
                    </div>

                    {/* Multiple photos selector inside card */}
                    {images.length > 1 && (
                      <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPreviewImageIndex(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              previewImageIndex === i
                                ? 'bg-sky-400 w-5'
                                : 'bg-white/50 hover:bg-white/80'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Body in Preview */}
                  <div className="p-4 flex flex-col gap-2.5">
                    <h4 className="font-bold text-white text-base leading-snug line-clamp-2">
                      {name || 'Nombre del Repuesto o Accesorio'}
                    </h4>

                    {sku && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Código / OEM: {sku}
                      </span>
                    )}

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {description ||
                        'Aquí se mostrará la descripción completa que convencerá al motero de comprar este repuesto.'}
                    </p>

                    {/* Sizes chips */}
                    {sizes.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">
                          Compatible:
                        </span>
                        {sizes.slice(0, 3).map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                        {sizes.length > 3 && (
                          <span className="text-[10px] text-sky-400">
                            +{sizes.length - 3} más
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price and Cart button */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Precio Especial
                        </span>
                        <span className="text-xl font-black text-emerald-400 font-mono">
                          {formatCurrency(price, 'COP')}
                        </span>
                        {price >= shippingConfig.freeShippingThreshold && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                            <Truck className="w-3 h-3" />
                            Envío Gratis Nacional
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md opacity-90 cursor-not-allowed"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Comprar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Conversion Tips Box */}
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Buenas prácticas de catálogo:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    <li>Sube al menos 2 fotos con fondo neutro o iluminadas.</li>
                    <li>Incluye el modelo de moto exacto en las medidas/compatibilidad.</li>
                    <li>Describe si el repuesto es original o de homologación certificada.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

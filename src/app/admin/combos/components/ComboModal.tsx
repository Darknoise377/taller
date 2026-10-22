// src/app/admin/combos/components/ComboModal.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Gift,
  Sparkles,
  Flame,
  Plus,
  Trash2,
  UploadCloud,
  Check,
  Calendar,
  Layers,
  DollarSign,
  AlertCircle,
  Eye,
  Loader2,
  Wand2,
  ShoppingBag,
  Clock,
  ArrowRight,
  Info,
  ExternalLink,
  RefreshCw,
  Truck,
  Store,
} from 'lucide-react';
import { message } from 'antd';
import { sanitizeComboTitle, hasForbiddenWords } from '@/utils/meliSanitizer';
import { AdminCombo, ProductOption } from '../types';
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
    .replace(/^-+|-+$/g, '')
    .trim();
}

const BADGE_PRESETS = [
  'MÁS VENDIDO',
  'OFERTA FLASH',
  'KIT RECOMENDADO',
  'EDICIÓN LIMITADA',
  'AHORRO MÁXIMO',
  'NUEVO',
];

const DISCOUNT_PRESETS = [10, 15, 20, 25, 30, 40];

interface ComboModalProps {
  isOpen: boolean;
  onClose: () => void;
  combo: AdminCombo | null;
  products: ProductOption[];
  onSave: (payload: Partial<AdminCombo>) => Promise<void>;
  isSaving: boolean;
}

export default function ComboModal({
  isOpen,
  onClose,
  combo,
  products,
  onSave,
  isSaving,
}: ComboModalProps) {
  // Form States
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [currency, setCurrency] = useState('COP');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Images state
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Items state
  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([]);

  // Surprise Gift state
  const [hasGift, setHasGift] = useState(false);
  const [giftName, setGiftName] = useState('');
  const [giftHint, setGiftHint] = useState('');
  const [giftValue, setGiftValue] = useState<number>(0);

  // Mercado Libre states
  const [meliExport, setMeliExport] = useState(false);
  const [meliTitle, setMeliTitle] = useState('');
  const [meliListingType, setMeliListingType] = useState('gold_special');
  const [isSyncingMeli, setIsSyncingMeli] = useState(false);

  // AI states
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [formError, setFormError] = useState('');

  // Search product inside modal
  const [productSearch, setProductSearch] = useState('');

  // Load existing combo or reset
  useEffect(() => {
    if (!isOpen) return;

    if (combo) {
      setName(combo.name || '');
      setSlug(combo.slug || '');
      setIsManualSlug(true);
      setDescription(combo.description || '');
      setBadge(combo.badge || '');
      setPrice(combo.price || 0);
      setOriginalPrice(combo.originalPrice || 0);
      setStock(combo.stock ?? 10);
      setCurrency(combo.currency || 'COP');
      setExpiresAt(combo.expiresAt ? combo.expiresAt.slice(0, 16) : '');
      setIsActive(combo.isActive ?? true);
      setIsFeatured(combo.isFeatured ?? false);

      const existingImages = combo.images?.length
        ? combo.images
        : combo.imageUrl
        ? [combo.imageUrl]
        : [];
      setImages(existingImages);
      setImageUrl(existingImages[0] || '');

      setItems(
        combo.items?.map((i) => ({
          productId: i.productId,
          quantity: i.quantity || 1,
        })) || []
      );

      setMeliExport(Boolean(combo.meliExport));
      setMeliTitle(combo.meliTitle || sanitizeComboTitle(combo.name || ''));
      setMeliListingType(combo.meliListingType || 'gold_special');

      if (combo.surpriseGift) {
        setHasGift(true);
        setGiftName(combo.surpriseGift.giftName || '');
        setGiftHint(combo.surpriseGift.hint || '');
        setGiftValue(combo.surpriseGift.giftValue || 0);
      } else {
        setHasGift(false);
        setGiftName('');
        setGiftHint('');
        setGiftValue(0);
      }
    } else {
      // New combo defaults
      setName('');
      setSlug('');
      setIsManualSlug(false);
      setDescription('');
      setBadge('');
      setPrice(0);
      setOriginalPrice(0);
      setStock(10);
      setCurrency('COP');
      setExpiresAt('');
      setIsActive(true);
      setIsFeatured(false);
      setImages([]);
      setImageUrl('');
      setItems([]);
      setHasGift(false);
      setGiftName('');
      setGiftHint('');
      setGiftValue(0);
      setMeliExport(false);
      setMeliTitle('');
      setMeliListingType('gold_special');
    }
    setFormError('');
  }, [isOpen, combo]);

  // Handle Name Change & Auto-Slug & Auto-MeLi-Title
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isManualSlug) {
      setSlug(slugify(val));
    }
    // Si aún no se ha personalizado el título de MeLi manualmente, sincronizarlo con el formato de MeLi
    if (!combo || !combo.meliTitle) {
      setMeliTitle(sanitizeComboTitle(val));
    }
  };

  // Compute sum of items original prices
  const itemsCalculatedSum = useMemo(() => {
    return items.reduce((acc, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return acc + (prod ? prod.price * item.quantity : 0);
    }, 0);
  }, [items, products]);

  // Suggested minimum stock based on components
  const suggestedStock = useMemo(() => {
    if (items.length === 0) return 0;
    const stocks = items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return prod ? Math.floor(prod.stock / item.quantity) : 0;
    });
    return Math.max(0, Math.min(...stocks));
  }, [items, products]);

  // Real-time Savings Calculation
  const savingsAmount = Math.max(0, originalPrice - price);
  const savingsPercent = originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

  // Apply quick discount preset
  const applyDiscountPreset = (pct: number) => {
    const base = originalPrice > 0 ? originalPrice : itemsCalculatedSum;
    if (base <= 0) return;
    if (originalPrice <= 0) {
      setOriginalPrice(base);
    }
    const discounted = Math.round(base * (1 - pct / 100));
    setPrice(discounted);
  };

  // Sync original price with calculated sum
  const handleSyncOriginalPrice = () => {
    if (itemsCalculatedSum > 0) {
      setOriginalPrice(itemsCalculatedSum);
      if (price === 0 || price >= itemsCalculatedSum) {
        // default 15% discount
        setPrice(Math.round(itemsCalculatedSum * 0.85));
      }
    }
  };

  // Add Item to Combo
  const handleAddItem = (productId: string) => {
    if (!productId) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
    setProductSearch('');
  };

  // Update Item Quantity
  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
    );
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Handle Image Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadImage(file);
        if (res.url) {
          uploadedUrls.push(res.url);
        }
      }

      setImages((prev) => {
        const updated = [...prev, ...uploadedUrls];
        if (!imageUrl && updated.length > 0) {
          setImageUrl(updated[0]);
        }
        return updated;
      });
      if (!imageUrl && uploadedUrls.length > 0) {
        setImageUrl(uploadedUrls[0]);
      }
    } catch {
      setFormError('Error al subir la imagen. Intenta con un archivo más ligero.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Image
  const handleRemoveImage = (urlToRemove: string) => {
    setImages((prev) => {
      const next = prev.filter((u) => u !== urlToRemove);
      if (imageUrl === urlToRemove) {
        setImageUrl(next[0] || '');
      }
      return next;
    });
  };

  // AI Vision: Analyze Image
  const handleAnalyzeImage = async () => {
    const targetUrl = imageUrl || images[0];
    if (!targetUrl) {
      setFormError('Primero sube una imagen para que la IA la analice.');
      return;
    }

    setIsAnalyzingImage(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/combos/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: targetUrl }),
      });
      const data = (await res.json()) as { name?: string; description?: string; error?: string };
      if (!res.ok || !data.name) {
        throw new Error(data.error || 'No se pudo analizar la imagen');
      }

      setName(data.name);
      if (!isManualSlug) {
        setSlug(slugify(data.name));
      }
      if (data.description) {
        setDescription(data.description);
      }
    } catch (err) {
      setFormError((err as Error).message || 'Error al analizar imagen con IA');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // AI Copywriter: Generate Description
  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      setFormError('Por favor ingresa primero el nombre del combo para generar la descripción.');
      return;
    }

    setIsGeneratingDesc(true);
    setFormError('');
    try {
      const itemNames = items
        .map((i) => products.find((p) => p.id === i.productId)?.name)
        .filter(Boolean) as string[];

      const res = await fetch('/api/admin/combos/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), items: itemNames }),
      });
      const data = (await res.json()) as { description?: string; error?: string };
      if (!res.ok || !data.description) {
        throw new Error(data.error || 'Error al redactar descripción');
      }

      setDescription(data.description);
    } catch (err) {
      setFormError((err as Error).message || 'Error al redactar con IA');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  // Mercado Libre Financial Simulation
  const meliCommissionRate = meliListingType === 'gold_premium' ? 18.5 : 16.5;
  const meliFixedCost = 3500;
  const meliShippingCost = 10000;
  // En Mercado Libre Colombia precios >= $60.000 COP tienen envío gratis obligatorio para el comprador
  const rawBaseEstimate = price > 0 ? (price + meliFixedCost) / (1 - meliCommissionRate / 100) : 0;
  const hasMeliFreeShipping = rawBaseEstimate >= 60000 || price >= 60000;
  const appliedShippingCost = hasMeliFreeShipping ? meliShippingCost : 0;
  const simulatedMeliPrice = price > 0
    ? Math.ceil((price + meliFixedCost + appliedShippingCost) / (1 - meliCommissionRate / 100) / 100) * 100
    : 0;
  const simulatedMeliCommission = Math.round((simulatedMeliPrice * meliCommissionRate) / 100);
  const simulatedNetToSeller = simulatedMeliPrice - simulatedMeliCommission - meliFixedCost - appliedShippingCost;

  const handleSyncMeliNow = async () => {
    if (!combo?.id) return;
    setIsSyncingMeli(true);
    try {
      const res = await fetch(`/api/meli/sync/combo/${combo.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar con Mercado Libre');
      message.success('¡Combo sincronizado con éxito en Mercado Libre! 🚀');
    } catch (err) {
      message.error((err as Error).message || 'Error al sincronizar');
    } finally {
      setIsSyncingMeli(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('El nombre del combo es obligatorio.');
      return;
    }

    if (items.length === 0) {
      setFormError('Debes agregar al menos un producto al combo.');
      return;
    }

    if (price <= 0) {
      setFormError('El precio del combo debe ser mayor a 0.');
      return;
    }

    if (originalPrice < price) {
      setFormError('El precio original debe ser igual o mayor al precio del combo.');
      return;
    }

    if (hasGift && !giftName.trim()) {
      setFormError('Si activas el regalo sorpresa, ingresa el nombre del regalo.');
      return;
    }

    const payload: Partial<AdminCombo> = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      description: description.trim(),
      price: Number(price),
      originalPrice: Number(originalPrice || price),
      stock: Number(stock),
      currency,
      badge: badge.trim() || null,
      imageUrl: imageUrl || images[0] || null,
      images,
      isActive,
      isFeatured,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      meliExport,
      meliTitle: meliTitle.trim() || null,
      meliListingType,
      items,
      surpriseGift: hasGift
        ? {
            giftName: giftName.trim(),
            hint: giftHint.trim() || null,
            giftValue: giftValue > 0 ? Number(giftValue) : null,
          }
        : null,
    };

    try {
      await onSave(payload);
    } catch (err) {
      setFormError((err as Error).message || 'Error al guardar el combo');
    }
  };

  // Products filtered for the picker
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 8);
    const q = productSearch.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, productSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 p-0.5 shadow-md">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Gift className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                {combo ? 'Editar Combo & Kit' : 'Crear Nuevo Combo & Kit'}
              </h2>
              <p className="text-xs text-slate-400">
                Configura los productos, calcula el descuento automático y previsualiza en vivo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split into Form (Left) and Live Preview (Right) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 scrollbar-thin">
          {/* LEFT COLUMN: THE FORM (8 cols on lg) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-6">
            {/* Error Banner */}
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Section 1: Basic Info */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Información Principal</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre del Combo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Kit Mantenimiento Total Pro"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Slug URL
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualSlug(false);
                        setSlug(slugify(name));
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300"
                    >
                      Autogenerar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setIsManualSlug(true);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="kit-mantenimiento-total-pro"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Badge Promocional (Opcional)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Ej: OFERTA FLASH"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>
              </div>

              {/* Badge Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 font-medium">Sugerencias:</span>
                {BADGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBadge(p)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                      badge === p
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Images & AI Vision */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <UploadCloud className="w-4 h-4 text-sky-400" />
                  <span>Imágenes del Combo</span>
                </div>

                {images.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAnalyzeImage}
                    disabled={isAnalyzingImage}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 transition-all"
                  >
                    {isAnalyzingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isAnalyzingImage ? 'Analizando...' : '✨ Autocompletar con IA'}</span>
                  </button>
                )}
              </div>

              {/* Image Previews */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {images.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setImageUrl(url)}
                    className={`group relative h-20 rounded-xl overflow-hidden border cursor-pointer transition-all ${
                      imageUrl === url
                        ? 'ring-2 ring-sky-400 border-transparent shadow-md'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Image src={url} alt={`Imagen ${idx + 1}`} fill className="object-cover" />
                    {imageUrl === url && (
                      <span className="absolute top-1 left-1 bg-sky-500 text-white p-0.5 rounded-full">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(url);
                      }}
                      className="absolute bottom-1 right-1 p-1 rounded-md bg-black/70 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="h-20 rounded-xl border border-dashed border-slate-700 hover:border-sky-500 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-sky-400 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-all disabled:opacity-50"
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  <span>{isUploadingImage ? 'Subiendo...' : 'Subir'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Haz clic en cualquier imagen para marcarla como principal de portada.
              </p>
            </div>

            {/* Section 3: Description with AI writer */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Descripción Comercial <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDesc}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold disabled:opacity-50 transition-all"
                >
                  {isGeneratingDesc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingDesc ? 'Generando...' : '✨ Redactar con IA'}</span>
                </button>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe los beneficios del kit, qué problema resuelve y por qué es una oportunidad irrepetible..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                required
              />
            </div>

            {/* Section 4: Products Bundler (The Core of Combo) */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Productos del Combo ({items.length})</span>
                </div>
                {itemsCalculatedSum > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncOriginalPrice}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold underline decoration-dotted"
                  >
                    Usar suma ({formatCurrency(itemsCalculatedSum, 'COP')}) como Precio Original
                  </button>
                )}
              </div>

              {/* Product Search & Picker */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto por nombre o categoría para agregar al combo..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />

                {/* Filtered suggestions list */}
                {productSearch.trim().length > 0 && (
                  <div className="max-h-44 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-1.5 space-y-1">
                    {filteredProducts.length === 0 ? (
                      <p className="p-2 text-xs text-slate-400 text-center">
                        No se encontraron productos coincidentes
                      </p>
                    ) : (
                      filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleAddItem(p.id)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                            <span className="text-[10px] text-slate-400">
                              Stock: {p.stock} un. | Cat: {p.category || 'General'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {formatCurrency(p.price, 'COP')}
                            </span>
                            <span className="p-1 rounded-md bg-sky-500/20 text-sky-300">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Products List */}
              <div className="space-y-2 pt-2">
                {items.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    Aún no has agregado productos a este combo. Usa el buscador de arriba para seleccionar.
                  </div>
                ) : (
                  items.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const itemTotal = prod ? prod.price * item.quantity : 0;

                    return (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/80 gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {prod?.name ?? 'Producto no encontrado'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span>Unitario: {formatCurrency(prod?.price ?? 0, 'COP')}</span>
                            <span>•</span>
                            <span>Stock actual: {prod?.stock ?? 0}</span>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold font-mono text-white px-1">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            +
                          </button>
                        </div>

                        {/* Total per item */}
                        <span className="text-xs font-bold font-mono text-slate-200 shrink-0 w-24 text-right">
                          {formatCurrency(itemTotal, 'COP')}
                        </span>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Section 5: Smart Pricing & Discounts */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Precios & Descuento Inteligente</span>
              </div>

              {/* Discount Presets Buttons */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Calcular Descuento Rápido (sobre suma original):
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DISCOUNT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyDiscountPreset(pct)}
                      className="py-1.5 px-2 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-sky-500/40 transition-all"
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Precio Original (Tachado en Tienda) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Suma productos: {formatCurrency(itemsCalculatedSum, 'COP')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Precio del Combo (Precio Final) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    required
                  />
                  {savingsAmount > 0 && (
                    <span className="text-[11px] text-emerald-400 font-bold mt-1 block">
                      Ahorro cliente: {formatCurrency(savingsAmount, 'COP')} ({savingsPercent}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Stock and Expiration Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Stock del Combo (Unidades) <span className="text-rose-400">*</span>
                    </label>
                    {suggestedStock > 0 && (
                      <button
                        type="button"
                        onClick={() => setStock(suggestedStock)}
                        className="text-[10px] text-sky-400 hover:text-sky-300"
                      >
                        Sugerir ({suggestedStock})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fecha de Expiración (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Section 6: Surprise Gift */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span>Regalo Sorpresa Incluido</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasGift(!hasGift)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    hasGift ? 'bg-purple-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      hasGift ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {hasGift && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Nombre Real del Regalo (Interno / Factura) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={giftName}
                      onChange={(e) => setGiftName(e.target.value)}
                      placeholder="Ej: Guantes de protección Pro Grip XL"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      required={hasGift}
                    />
                    <span className="text-[10px] text-purple-400/80 mt-0.5 block">
                      Solo visible para ti y en el email de confirmación tras la compra.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Pista para la Tienda (Público)
                      </label>
                      <input
                        type="text"
                        value={giftHint}
                        onChange={(e) => setGiftHint(e.target.value)}
                        placeholder="Ej: Accesorio de seguridad para lluvia"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Valor Estimado (COP)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={giftValue}
                        onChange={(e) => setGiftValue(Number(e.target.value))}
                        placeholder="35000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 7: Visibility & Placement */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-semibold text-white">Publicado en Tienda (Activo)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  Destacar en Inicio (Hero & Vitrina)
                </span>
              </label>
            </div>

            {/* Section 8: Sincronización con Mercado Libre */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-md shadow-amber-500/20">
                    <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                      <Store className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        Sincronización con Mercado Libre
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        MELI SYNC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Publica este combo en Mercado Libre blindando tus márgenes (comisión + flete) y con stock compuesto.
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => setMeliExport(!meliExport)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    meliExport ? 'bg-amber-500 shadow-md shadow-amber-500/30' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                      meliExport ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {meliExport && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  {/* Título en MeLi */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-amber-200">
                        Título en Mercado Libre <span className="text-rose-400">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMeliTitle(sanitizeComboTitle(name))}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          ✨ Sugerir título conforme MeLi
                        </button>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            meliTitle.length > 60 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {meliTitle.length}/60
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      maxLength={60}
                      value={meliTitle}
                      onChange={(e) => setMeliTitle(e.target.value)}
                      placeholder="Ej: Kit Mantenimiento Bajaj Pulsar 200 Ns Filtro Y Bujias"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />

                    {hasForbiddenWords(meliTitle) && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Mercado Libre prohíbe palabras promocionales como &quot;oferta&quot;, &quot;descuento&quot;, &quot;promo&quot; o &quot;gratis&quot; en el título.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tipo de Publicación */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Tipo de Publicación
                      </label>
                      <select
                        value={meliListingType}
                        onChange={(e) => setMeliListingType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="gold_special">Clásica (16.5% comisión — Alta exposición)</option>
                        <option value="gold_premium">Premium (18.5% comisión — Cuotas sin interés)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Stock Compuesto para MeLi
                      </label>
                      <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-center justify-between">
                        <span>Límite por repuestos:</span>
                        <strong className="text-amber-400 font-mono">
                          {Math.min(stock, suggestedStock || stock)} unidades
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Simulador Financiero Mercado Libre */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        Desglose Financiero Blindado (Precio MeLi)
                      </span>
                      {hasMeliFreeShipping && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Envío Gratis Comprador
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Precio Combo Web:</span>
                        <strong className="text-white font-mono">{formatCurrency(price, 'COP')}</strong>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">+ Flete MeLi (10k):</span>
                        <strong className="text-amber-400 font-mono">
                          {hasMeliFreeShipping ? `+${formatCurrency(meliShippingCost, 'COP')}` : 'Sin flete obligatorio'}
                        </strong>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">+ Costo Fijo / Empaque:</span>
                        <strong className="text-slate-300 font-mono">+{formatCurrency(meliFixedCost, 'COP')}</strong>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">+ Comisión ({meliCommissionRate}%):</span>
                        <strong className="text-amber-300 font-mono">+{formatCurrency(simulatedMeliCommission, 'COP')}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">PVP Publicado en Mercado Libre:</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                            {formatCurrency(simulatedMeliPrice, 'COP')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (Neto para ti: <strong className="text-emerald-400 font-mono">{formatCurrency(simulatedNetToSeller, 'COP')}</strong>)
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 max-w-xs text-right">
                        ✓ Recibes el 100% de los <strong>{formatCurrency(price, 'COP')}</strong> del combo limpios.
                      </div>
                    </div>
                  </div>

                  {/* Publicación activa en MeLi */}
                  {combo?.meliListing && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/20 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                          {combo.meliListing.meliItemId}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          Estado: <strong className="text-emerald-400">{combo.meliListing.status}</strong>
                        </span>
                        {combo.meliListing.meliPermalink && (
                          <a
                            href={combo.meliListing.meliPermalink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline font-semibold"
                          >
                            <span>Ver publicación</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSyncMeliNow}
                        disabled={isSyncingMeli}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMeli ? 'animate-spin' : ''}`} />
                        <span>{isSyncingMeli ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Action in Form Footer */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isSaving ? 'Guardando...' : combo ? 'Guardar Cambios' : 'Crear Combo'}</span>
              </button>
            </div>
          </form>

          {/* RIGHT COLUMN: LIVE CUSTOMER STORE PREVIEW (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="sticky top-0 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Eye className="w-4 h-4" />
                  Vista Previa en Vivo (Cliente)
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
                  100% interactivo
                </span>
              </div>

              {/* Mockup Container */}
              <div className="relative rounded-3xl bg-slate-950 p-4 border border-slate-800/90 shadow-2xl">
                {/* Simulated Customer Card */}
                <div className="relative flex flex-col bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                  {/* Media */}
                  <div className="relative h-48 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    {imageUrl || images[0] ? (
                      <Image
                        src={imageUrl || images[0]}
                        alt={name || 'Combo'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600">
                        <Gift className="w-12 h-12 opacity-50 mb-1" />
                        <span className="text-[11px]">Sube una foto para previsualizar</span>
                      </div>
                    )}

                    {/* Badges in Preview */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
                      {badge && (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                          <Flame className="w-3 h-3" />
                          {badge.toUpperCase()}
                        </span>
                      )}
                      {savingsPercent > 0 && (
                        <span className="inline-flex items-center bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                          -{savingsPercent}% OFF
                        </span>
                      )}
                    </div>

                    {isFeatured && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
                          <Sparkles className="w-2.5 h-2.5 fill-current" />
                          DESTACADO
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Countdown banner if expires */}
                  {expiresAt && (
                    <div className="bg-amber-950/60 border-b border-amber-800/50 px-3 py-1 flex items-center gap-1.5 text-amber-300 text-[10px] font-medium">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Oferta temporal: termina pronto</span>
                    </div>
                  )}

                  {/* Body in Preview */}
                  <div className="p-4 flex flex-col gap-3">
                    <h4 className="font-bold text-white text-base leading-tight">
                      {name || 'Nombre del Combo & Kit'}
                    </h4>

                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {description || 'Aquí aparecerá la descripción persuasiva que verá tu cliente en la tienda.'}
                    </p>

                    {/* Products Included */}
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Incluye {items.length} productos:
                      </span>
                      {items.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">
                          (Selecciona productos a la izquierda)
                        </span>
                      ) : (
                        items.slice(0, 3).map((item, idx) => {
                          const prod = products.find((p) => p.id === item.productId);
                          return (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-300 truncate max-w-[170px]">
                                {item.quantity}x {prod?.name || 'Producto'}
                              </span>
                              <span className="text-slate-500 font-mono text-[10px]">
                                {formatCurrency((prod?.price || 0) * item.quantity, 'COP')}
                              </span>
                            </div>
                          );
                        })
                      )}
                      {items.length > 3 && (
                        <span className="text-[10px] text-sky-400 block pt-0.5">
                          +{items.length - 3} productos adicionales
                        </span>
                      )}
                    </div>

                    {/* Surprise Gift Preview */}
                    {hasGift && (
                      <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-950/40 to-indigo-950/30 border border-purple-500/30 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-purple-300 block">
                            🎁 Regalo Sorpresa Incluido
                          </span>
                          <span className="text-[10px] text-purple-400/90 truncate block">
                            Pista: &quot;{giftHint || 'Regalo especial para tu moto'}&quot;
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Price and Add button */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        {originalPrice > price && (
                          <span className="text-[11px] text-slate-500 line-through font-mono block">
                            {formatCurrency(originalPrice, 'COP')}
                          </span>
                        )}
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          {formatCurrency(price, 'COP')}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md opacity-90 cursor-not-allowed"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Comprar Combo</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Helpful tips box */}
                <div className="mt-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                    <Info className="w-3.5 h-3.5" />
                    <span>Tip de Conversión:</span>
                  </div>
                  <p>
                    Los combos con descuentos entre 15% y 25% y un regalo sorpresa tienen hasta 3.2x mayor tasa de conversión que productos sueltos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

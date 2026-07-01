'use client';

import React, { useEffect, useState, useCallback, Fragment } from 'react';
import {
  Share2, CheckCircle, XCircle, Unplug, Send, Sparkles, Upload as UploadIcon,
  Edit3, Facebook, Instagram, Image as ImageIcon, Video, Loader2, AlertCircle,
  ChevronDown, X, ThumbsUp, MessageCircle, Share, TrendingUp, Eye,
  RefreshCw, Zap, Package, Gift, Settings, Copy, Check,
} from 'lucide-react';
import Image from 'next/image';

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
  images?: string[];
  videoUrl?: string;
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
    images?: string[];
  };
}

interface Combo {
  id: string;
  name: string;
  imageUrl?: string;
  images?: string[];
  price: number;
  description?: string;
  slug: string;
  originalPrice: number;
  items?: ComboItem[];
}

interface FlashSale {
  id: string;
  name: string;
  description?: string;
  discount: number;
  isActive: boolean;
}

interface SocialPostRow {
  id: string;
  platform: string;
  status: string;
  metaPostId?: string;
  caption: string;
  mediaUrl?: string;
  createdAt: string;
  insights?: Record<string, number>;
}

export default function AdminMetaPage() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [posts, setPosts] = useState<SocialPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [editModal, setEditModal] = useState<{ visible: boolean; post: SocialPostRow | null }>({ visible: false, post: null });
  const [itemType, setItemType] = useState<'PRODUCT' | 'COMBO' | 'FLASH_SALE' | 'UPLOAD'>('PRODUCT');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    itemId: '',
    caption: '',
    platform: 'FACEBOOK' as 'FACEBOOK' | 'INSTAGRAM' | 'BOTH',
    useVideo: false,
  });

  const [manualFormData, setManualFormData] = useState({
    pageAccessToken: '',
    pageId: '',
    instagramAccountId: '',
  });

  const [editFormData, setEditFormData] = useState({ caption: '' });

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-5 ${
      type === 'success' ? 'bg-emerald-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    toast.innerHTML = `
      ${type === 'success' ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : ''}
      ${type === 'error' ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>' : ''}
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-top-5');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

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

  const loadFlashSales = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/flash-sales');
      if (res.ok) {
        const data = await res.json();
        setFlashSales(data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/publish');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStatus(), loadProducts(), loadCombos(), loadFlashSales(), loadPosts()])
      .finally(() => setLoading(false));
  }, [loadStatus, loadProducts, loadCombos, loadFlashSales, loadPosts]);

  const handleConnect = () => {
    window.location.href = '/api/meta/oauth/login?storeId=default';
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/meta/oauth/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'default',
          ...manualFormData,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res.ok) {
        showToast('Conexión guardada exitosamente', 'success');
        setManualModal(false);
        loadStatus();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al guardar', 'error');
      }
    } catch {
      showToast('Error al guardar conexión', 'error');
    }
  };

  const handleDisconnect = async () => {
    const res = await fetch('/api/meta/oauth/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: 'default' }),
    });
    if (res.ok) {
      showToast('Conexión Meta revocada', 'success');
      setStatus({ connected: false });
      setShowDisconnectConfirm(false);
    } else {
      showToast('Error al desconectar', 'error');
    }
  };

  const generateCaptionAI = async (itemId: string, currentItemType: 'PRODUCT' | 'COMBO' | 'FLASH_SALE' = itemType as 'PRODUCT' | 'COMBO' | 'FLASH_SALE') => {
    let item: Product | Combo | FlashSale | undefined;
    let productUrl = '';

    if (currentItemType === 'PRODUCT') {
      item = products.find(p => p.id === itemId);
      if (item) productUrl = `https://www.motoservicioayr.com/products/${(item as Product).slug || item.id}`;
    } else if (currentItemType === 'COMBO') {
      item = combos.find(c => c.id === itemId);
      if (item) productUrl = `https://www.motoservicioayr.com/combos/${(item as Combo).slug}`;
    } else if (currentItemType === 'FLASH_SALE') {
      item = flashSales.find(f => f.id === itemId);
      productUrl = 'https://www.motoservicioayr.com/flash-sales';
    }

    if (!item) return;

    const description = 'description' in item ? item.description : undefined;
    const price = 'price' in item ? item.price : undefined;

    setGeneratingCaption(true);
    try {
      const res = await fetch('/api/meta/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          description,
          price,
          productUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.caption) {
        setFormData(prev => ({ ...prev, caption: data.caption }));
        showToast('Descripción generada con IA', 'success');
      } else {
        showToast(data.error || 'Error al generar descripción', 'error');
      }
    } catch {
      showToast('Error al generar descripción', 'error');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    try {
      let mediaUrls: string | string[] = [];
      let isVideo = false;
      
      if (itemType === 'UPLOAD' && uploadedFile) {
        const formData = new FormData();
        formData.append('storeId', 'default');
        formData.append('caption', formData.caption);
        formData.append('platform', formData.platform);
        formData.append('file', uploadedFile);
        isVideo = uploadedFile.type.startsWith('video/');
        formData.append('isVideo', String(isVideo));

        const res = await fetch('/api/meta/publish', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al publicar');
        }
        showToast('Publicado exitosamente', 'success');
        setFormData({ itemId: '', caption: '', platform: 'FACEBOOK', useVideo: false });
        setUploadedFile(null);
        loadPosts();
        return;
      }

      if (itemType === 'FLASH_SALE') {
        const sale = flashSales.find(f => f.id === formData.itemId);
        if (!sale) {
          showToast('Selecciona una oferta válida', 'error');
          return;
        }
        const allImages = products.flatMap(p => p.images || []).filter(Boolean);
        mediaUrls = allImages.length > 0 ? allImages : [products[0]?.imageUrl || 'https://www.motoservicioayr.com/og-image.jpg'];
      } else {
        const item = itemType === 'PRODUCT'
          ? products.find(p => p.id === formData.itemId) as Product | undefined
          : combos.find(c => c.id === formData.itemId) as Combo | undefined;

        if (!item) {
          showToast('Selecciona un producto o combo', 'error');
          return;
        }

        const selectedProduct = item as Product;
        const selectedCombo = item as Combo;
        if (formData.useVideo && selectedProduct.videoUrl) {
          mediaUrls = selectedProduct.videoUrl;
          isVideo = true;
        } else {
          const allImages = itemType === 'PRODUCT'
            ? [...(selectedProduct.images || []), selectedProduct.imageUrl].filter(Boolean) as string[]
            : [...(selectedCombo.images || []), selectedCombo.imageUrl].filter(Boolean) as string[];
          if (allImages.length === 0) {
            showToast('Selecciona un producto o combo con imagen/video', 'error');
            return;
          }
          mediaUrls = allImages;
        }
      }
      
      console.log('[handlePublish] Media URLs:', { 
        itemType, 
        mediaUrlsCount: Array.isArray(mediaUrls) ? mediaUrls.length : 1,
        mediaUrlsSample: Array.isArray(mediaUrls) ? mediaUrls.slice(0, 3) : mediaUrls 
      });

      const res = await fetch('/api/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: 'default',
          mediaUrls,
          caption: formData.caption,
          platform: formData.platform,
          isVideo,
        }),
      });

      if (res.ok) {
        showToast(`Publicado exitosamente (${Array.isArray(mediaUrls) ? mediaUrls.length + ' imágenes' : '1 imagen/video'})`, 'success');
        setFormData({ itemId: '', caption: '', platform: 'FACEBOOK', useVideo: false });
        loadPosts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al publicar', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error inesperado', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.post) return;
    
    try {
      const res = await fetch('/api/meta/publish', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: editModal.post.id,
          caption: editFormData.caption,
        }),
      });

      if (res.ok) {
        showToast('Publicación actualizada', 'success');
        setEditModal({ visible: false, post: null });
        loadPosts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al actualizar', 'error');
      }
    } catch {
      showToast('Error al actualizar', 'error');
    }
  };

  const selectedProduct = products.find(p => p.id === formData.itemId);
  const productHasVideo = itemType === 'PRODUCT' && selectedProduct?.videoUrl;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] flex items-center justify-center">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Cargando integración Meta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Share2 className="text-white" size={20} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Centro de Publicaciones Meta</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 ml-[52px]">
          Gestiona y publica contenido en Facebook e Instagram desde tu tienda.
        </p>
      </div>

      {/* ── Connection Status Card ── */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {status?.connected ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-emerald-500" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Conectado a Meta</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Activo
                    </span>
                  </div>
                  {status.pageId && (
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Página ID: <code className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-xs">{status.pageId}</code>
                    </p>
                  )}
                  {status.hasInstagram && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                      <Instagram size={13} />
                      Instagram Business conectado
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <XCircle className="text-red-500" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No conectado</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">Conecta tu cuenta de Meta para publicar contenido.</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <button
                  onClick={() => setManualModal(true)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Settings size={15} />
                  <span className="hidden sm:inline">Editar tokens</span>
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Unplug size={15} />
                  <span className="hidden sm:inline">Desconectar</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setManualModal(true)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Conexión manual
                </button>
                <button
                  onClick={handleConnect}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2 shadow-sm"
                >
                  <Share2 size={15} />
                  Conectar con Meta
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Publish Form ── */}
      <form onSubmit={handlePublish} className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-slate-800">
          <Send className="text-blue-500" size={20} />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Publicar contenido</h3>
        </div>

        {/* Tipo de contenido */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Tipo de contenido</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: 'PRODUCT', label: 'Producto', icon: Package },
              { value: 'COMBO', label: 'Combo', icon: Gift },
              { value: 'FLASH_SALE', label: 'Oferta Flash', icon: Zap },
              { value: 'UPLOAD', label: 'Subir archivo', icon: UploadIcon },
            ].map((type) => {
              const Icon = type.icon;
              const active = itemType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setItemType(type.value as typeof itemType);
                    setFormData(prev => ({ ...prev, itemId: '' }));
                  }}
                  className={`p-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                    active
                      ? 'border-[#2E5FA7] bg-blue-50 dark:bg-blue-900/20 text-[#0A2A66] dark:text-blue-300'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-600 dark:text-slate-400'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload file */}
        {itemType === 'UPLOAD' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Subir archivo</label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl cursor-pointer bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    {uploadedFile.type.startsWith('video/') ? <Video className="text-blue-500" size={24} /> : <ImageIcon className="text-blue-500" size={24} />}
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{uploadedFile.name}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setUploadedFile(null); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <>
                  <UploadIcon className="text-gray-400 mb-2" size={32} />
                  <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Click o arrastra para subir</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Imágenes (PNG, JPG, WebP) o Videos (MP4, WebM, Mov)</p>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*"
                aria-label="Seleccionar archivo de imagen o video"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadedFile(file);
                }}
              />
            </label>
          </div>
        )}

        {/* Selector de item */}
        {itemType !== 'UPLOAD' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Seleccionar {itemType === 'PRODUCT' ? 'producto' : itemType === 'COMBO' ? 'combo' : 'oferta'}
            </label>
            <div className="relative">
              <select
                value={formData.itemId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, itemId: val }));
                  if (val) generateCaptionAI(val);
                }}
                required
                aria-label={`Seleccionar ${itemType === 'PRODUCT' ? 'producto' : itemType === 'COMBO' ? 'combo' : 'oferta'}`}
                className="w-full px-4 py-3 pr-10 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E5FA7] focus:border-transparent outline-none transition-all"
              >
                <option value="">-- Seleccionar --</option>
                {itemType === 'PRODUCT' && products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.videoUrl ? '🎥' : ''} {p.images && p.images.length > 1 ? `📷${p.images.length}` : ''}</option>
                ))}
                {itemType === 'COMBO' && combos.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {itemType === 'FLASH_SALE' && flashSales.map(f => (
                  <option key={f.id} value={f.id}>{f.name} (-{f.discount}%)</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>
        )}

        {/* Preview de imágenes */}
        {(itemType === 'PRODUCT' || itemType === 'COMBO') && formData.itemId && (() => {
          let previewImages: string[] = [];
          if (itemType === 'PRODUCT') {
            const prod = products.find(p => p.id === formData.itemId);
            if (prod) previewImages = [...(prod.images || []), prod.imageUrl].filter(Boolean) as string[];
          } else {
            const combo = combos.find(c => c.id === formData.itemId);
            if (combo) previewImages = [...(combo.images || []), combo.imageUrl].filter(Boolean) as string[];
          }
          if (previewImages.length === 0) return null;
          return (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-3">
                📷 {previewImages.length} imagen{previewImages.length !== 1 ? 'es' : ''} que se publicarán:
              </p>
              <div className="flex flex-wrap gap-2">
                {previewImages.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800">
                    <Image src={url} alt={`${i + 1}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Opción de video */}
        {productHasVideo && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Tipo de media</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, useVideo: false }))}
                className={`p-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                  !formData.useVideo
                    ? 'border-[#2E5FA7] bg-blue-50 dark:bg-blue-900/20 text-[#0A2A66] dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                }`}
              >
                <ImageIcon size={16} />
                Usar imágenes
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, useVideo: true }))}
                className={`p-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                  formData.useVideo
                    ? 'border-[#2E5FA7] bg-blue-50 dark:bg-blue-900/20 text-[#0A2A66] dark:text-blue-300'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                }`}
              >
                <Video size={16} />
                Usar video
              </button>
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="caption-input" className="text-sm font-semibold text-gray-700 dark:text-slate-300">Descripción</label>
            {itemType !== 'UPLOAD' && formData.itemId && (
              <button
                type="button"
                onClick={() => generateCaptionAI(formData.itemId)}
                disabled={generatingCaption}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors text-xs font-medium disabled:opacity-50"
              >
                {generatingCaption ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Generar con IA
              </button>
            )}
          </div>
          <textarea
            id="caption-input"
            value={formData.caption}
            onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
            required
            rows={4}
            maxLength={2200}
            placeholder="Escribe una descripción atractiva para la publicación..."
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E5FA7] focus:border-transparent outline-none transition-all resize-none"
          />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{formData.caption.length}/2200 caracteres</p>
        </div>

        {/* Plataforma */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Plataforma de publicación</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'FACEBOOK', label: 'Facebook', icon: Facebook, color: 'blue' },
              { value: 'INSTAGRAM', label: 'Instagram', icon: Instagram, color: 'pink' },
              { value: 'BOTH', label: 'Ambos', icon: Share2, color: 'purple' },
            ].map((platform) => {
              const Icon = platform.icon;
              const active = formData.platform === platform.value;
              return (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, platform: platform.value as typeof prev.platform }))}
                  className={`p-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                    active
                      ? 'border-[#2E5FA7] bg-blue-50 dark:bg-blue-900/20 text-[#0A2A66] dark:text-blue-300'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{platform.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!status?.connected || publishing}
          className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white hover:opacity-90 transition-opacity text-sm font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Send size={16} />
              Publicar ahora
            </>
          )}
        </button>
      </form>

      {/* ── Posts History ── */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-purple-500" size={20} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Historial de publicaciones</h3>
          </div>
          <button
            onClick={loadPosts}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={16} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Eye size={28} className="opacity-60" />
            </div>
            <p className="text-sm font-medium">No hay publicaciones aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left bg-gray-50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Media</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Plataforma</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Interacciones</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Descripción</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Meta ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {posts.map((post) => {
                  const platformConfig = {
                    FACEBOOK: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', icon: Facebook },
                    INSTAGRAM: { bg: 'bg-pink-500/15', text: 'text-pink-600 dark:text-pink-400', dot: 'bg-pink-500', icon: Instagram },
                    BOTH: { bg: 'bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500', icon: Share2 },
                  };
                  const statusConfig = {
                    PUBLISHED: { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Publicado' },
                    PROCESSING: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', label: 'Procesando' },
                    FAILED: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', label: 'Fallido' },
                    PENDING: { bg: 'bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500', label: 'Pendiente' },
                  };
                  const pc = platformConfig[post.platform as keyof typeof platformConfig] || platformConfig.FACEBOOK;
                  const sc = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.PENDING;
                  const PIcon = pc.icon;

                  return (
                    <tr key={post.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        {post.mediaUrl ? (
                          post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.webm') || post.mediaUrl.includes('.mov') ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center">
                              <Video size={20} className="text-gray-400" />
                            </div>
                          ) : (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                              <Image src={post.mediaUrl} alt="thumb" fill className="object-cover" />
                            </div>
                          )
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${pc.bg} ${pc.text}`}>
                          <PIcon size={12} />
                          {post.platform}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {post.insights ? (
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <ThumbsUp size={12} />
                              {post.insights.like || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle size={12} />
                              {post.insights.comments || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Share size={12} />
                              {post.insights.shares || 0}
                            </span>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-700 dark:text-slate-300 truncate max-w-[200px]">{post.caption}</p>
                      </td>
                      <td className="px-5 py-3">
                        {post.metaPostId ? (
                          <button
                            onClick={() => copyToClipboard(post.metaPostId!, post.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors group"
                          >
                            <code className="max-w-[80px] truncate">{post.metaPostId}</code>
                            {copiedId === post.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </button>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        {post.status === 'PUBLISHED' && (
                          <button
                            onClick={() => {
                              setEditModal({ visible: true, post });
                              setEditFormData({ caption: post.caption });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium flex items-center gap-1"
                          >
                            <Edit3 size={12} />
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Disconnect Confirmation Modal ── */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDisconnectConfirm(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mb-4">
              <AlertCircle className="text-red-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">¿Desconectar cuenta de Meta?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Se eliminarán los tokens guardados. Deberás volver a conectar para publicar contenido.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Sí, desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Connection Modal ── */}
      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setManualModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Conexión manual con Meta</h3>
              <button
                onClick={() => setManualModal(false)}
                title="Cerrar modal"
                aria-label="Cerrar modal de conexión manual"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleManualConnect} className="space-y-4">
              <div>
                <label htmlFor="page-access-token" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Page Access Token</label>
                <textarea
                  id="page-access-token"
                  value={manualFormData.pageAccessToken}
                  onChange={(e) => setManualFormData(prev => ({ ...prev, pageAccessToken: e.target.value }))}
                  required
                  rows={2}
                  placeholder="Pega el token de página infinito"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E5FA7] focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label htmlFor="page-id" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Page ID</label>
                <input
                  id="page-id"
                  type="text"
                  value={manualFormData.pageId}
                  onChange={(e) => setManualFormData(prev => ({ ...prev, pageId: e.target.value }))}
                  required
                  placeholder="ID de la página (ej: 123456789)"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E5FA7] focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="instagram-account-id" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Instagram Account ID (opcional)</label>
                <input
                  id="instagram-account-id"
                  type="text"
                  value={manualFormData.instagramAccountId}
                  onChange={(e) => setManualFormData(prev => ({ ...prev, instagramAccountId: e.target.value }))}
                  placeholder="ID de cuenta de Instagram Business"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E5FA7] focus:border-transparent outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white hover:opacity-90 transition-opacity text-sm font-semibold"
              >
                Guardar conexión
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Post Modal ── */}
      {editModal.visible && editModal.post && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditModal({ visible: false, post: null })} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar publicación</h3>
              <button
                onClick={() => setEditModal({ visible: false, post: null })}
                title="Cerrar modal"
                aria-label="Cerrar modal de edición"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleEditPost} className="space-y-4">
              <div>
                <label htmlFor="edit-caption" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Nueva descripción</label>
                <textarea
                  id="edit-caption"
                  value={editFormData.caption}
                  onChange={(e) => setEditFormData({ caption: e.target.value })}
                  required
                  rows={4}
                  maxLength={2200}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E5FA7] focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white hover:opacity-90 transition-opacity text-sm font-semibold"
              >
                Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Package,
  PackageSearch,
  Users,
  BadgePercent,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  Activity,
  ShoppingBag,
  Layers,
  ChevronRight,
  CreditCard,
  Truck,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Plus,
  Send,
  Boxes,
  HelpCircle,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { formatCurrency } from '@/utils/formatCurrency';

type RecentOrder = {
  id: number;
  referenceCode: string;
  customerName: string;
  total: number;
  status: string;
  paymentMethod?: string;
  shippingCost?: number;
  city?: string;
  phone?: string;
  createdAt: string;
};

type CriticalProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  category: string;
  sku?: string | null;
};

type DashboardStats = {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  shippedOrders: number;
  totalRevenue: number;
  wompiRevenue: number;
  contraentregaOrdersCount: number;
  totalUsers: number;
  recentOrders: RecentOrder[];
  criticalStockProducts: CriticalProduct[];
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  PENDING: {
    label: 'Pendiente',
    dot: 'bg-amber-500',
    text: 'text-amber-800 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/60',
  },
  APPROVED: {
    label: 'Pagado',
    dot: 'bg-emerald-500',
    text: 'text-emerald-800 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/60',
  },
  SHIPPED: {
    label: 'Enviado',
    dot: 'bg-blue-500',
    text: 'text-blue-800 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800/60',
  },
  DELIVERED: {
    label: 'Entregado',
    dot: 'bg-teal-500',
    text: 'text-teal-800 dark:text-teal-300',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800/60',
  },
  CANCELLED: {
    label: 'Cancelado',
    dot: 'bg-rose-500',
    text: 'text-rose-800 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800/60',
  },
  DECLINED: {
    label: 'Rechazado',
    dot: 'bg-rose-500',
    text: 'text-rose-800 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800/60',
  },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Error al cargar datos del dashboard');
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Mensaje para contactar por WhatsApp a un cliente
  const handleOpenWhatsApp = (order: RecentOrder) => {
    let phone = (order.phone || '').replace(/\D/g, '');
    if (phone.length === 10 && phone.startsWith('3')) {
      phone = `57${phone}`;
    }
    const msg = encodeURIComponent(
      `¡Hola ${order.customerName}! 👋 Te saludamos de *Motoservicio Taller A&R* con respecto a tu orden *#${order.id}* (Ref: ${order.referenceCode}).`
    );
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Loading skeleton refinado
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-72 rounded-lg bg-slate-100 dark:bg-slate-800/60" />
          </div>
          <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
          <div className="lg:col-span-4 h-96 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center shadow-sm max-w-md w-full">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-rose-500" size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            No se pudo cargar el dashboard
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-5 py-2.5 bg-[#0A2A66] hover:bg-[#071f4d] text-white rounded-xl transition-colors text-sm font-semibold shadow-sm"
          >
            Reintentar carga
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Porcentaje de recaudo online Wompi vs Contraentrega
  const wompiPercent = stats.totalRevenue > 0
    ? Math.min(100, Math.round((stats.wompiRevenue / stats.totalRevenue) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header Senior ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Panel de Control
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Taller A&R Activo
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 capitalize">
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Acciones Rápidas del Encabezado */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => router.push('/admin/products')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
            title="Generar link de pago Wompi / WhatsApp"
          >
            <CreditCard size={15} />
            <span>Generar Link de Pago</span>
          </button>

          <button
            onClick={() => router.push('/admin/products')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A2A66] hover:bg-[#071f4d] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Nuevo Producto</span>
          </button>

          <button
            onClick={loadDashboard}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Actualizar métricas"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── 2. KPI Cards de Nivel Ejecutivo (4 Métricas Clave) ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ingresos Totales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ingresos Totales
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-2">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <CreditCard size={12} className="text-sky-500" />
                Wompi: <strong>{formatCurrency(stats.wompiRevenue)}</strong>
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{wompiPercent}%</span>
            </div>
            {/* Barra de progreso visual Wompi vs Contraentrega */}
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${wompiPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: Pedidos */}
        <div
          onClick={() => router.push('/admin/orders')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer relative group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Órdenes Registradas
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <PackageSearch size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-2">
            {stats.totalOrders}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {stats.pendingOrders > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50">
                <Clock size={11} />
                {stats.pendingOrders} pendientes
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">Al día sin pendientes</span>
            )}
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {stats.approvedOrders ?? 0} pagadas
            </span>
          </div>
          <ArrowUpRight
            size={16}
            className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors"
          />
        </div>

        {/* KPI 3: Catálogo & Inventario */}
        <div
          onClick={() => router.push('/admin/products')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer relative group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inventario de Repuestos
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Package size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-2">
            {stats.totalProducts} <span className="text-sm font-semibold text-slate-500 font-normal">ítems</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {stats.outOfStockProducts > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/50">
                ⛔ {stats.outOfStockProducts} agotados
              </span>
            )}
            {stats.lowStockProducts > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50">
                ⚠️ {stats.lowStockProducts} stock bajo
              </span>
            )}
            {stats.outOfStockProducts === 0 && stats.lowStockProducts === 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} /> Stock saludable
              </span>
            )}
          </div>
          <ArrowUpRight
            size={16}
            className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 transition-colors"
          />
        </div>

        {/* KPI 4: Canales de Cobro */}
        <div
          onClick={() => router.push('/admin/orders?quick=CONTRAENTREGA')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer relative group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Canal Contraentrega
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Truck size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none mb-2">
            {stats.contraentregaOrdersCount}{' '}
            <span className="text-sm font-semibold text-slate-500 font-normal">pedidos</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Cobro en destino acordado</span>
            <span>•</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {stats.totalOrders - stats.contraentregaOrdersCount} Wompi
            </span>
          </p>
          <ArrowUpRight
            size={16}
            className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* ── 3. Sección Principal (Layout 12 Columnas: 8 Izq + 4 Der) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda (8 cols): Tabla de Órdenes Recientes con Canales */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[#0A2A66] inline-block" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Órdenes Recientes
                </h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 ml-3">
                Identificación de canal de pago (Wompi vs Contraentrega) y destino
              </p>
            </div>

            <button
              onClick={() => router.push('/admin/orders')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A2A66] dark:text-sky-400 hover:underline"
            >
              <span>Ver todas las órdenes</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Clock size={28} className="opacity-50" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Aún no hay órdenes registradas
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Las órdenes de tu tienda o ventas por WhatsApp aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-left">
                    <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Orden & Cliente
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Canal de Pago
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="pb-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {stats.recentOrders.map((order) => {
                    const sc = STATUS_CONFIG[order.status] || {
                      label: order.status,
                      dot: 'bg-slate-400',
                      text: 'text-slate-700 dark:text-slate-300',
                      bg: 'bg-slate-50 dark:bg-slate-800/40',
                      border: 'border-slate-200 dark:border-slate-700',
                    };
                    const isWompi = order.paymentMethod === 'WOMPI';
                    const isContra = order.paymentMethod === 'CONTRAENTREGA';

                    return (
                      <tr
                        key={order.id}
                        className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Cliente e ID */}
                        <td className="py-3.5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                              #{order.id}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[170px]">
                                {order.customerName}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {order.city || 'Colombia'} • {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Canal de Pago */}
                        <td className="py-3.5 pr-3">
                          {isWompi ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                              <CreditCard size={12} />
                              Wompi
                            </span>
                          ) : isContra ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              <Truck size={12} />
                              Contraentrega
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {order.paymentMethod || 'Web'}
                            </span>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-3.5 pr-3">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(order.total)}
                          </span>
                          {order.shippingCost && order.shippingCost > 0 ? (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              +{formatCurrency(order.shippingCost)} flete
                            </span>
                          ) : null}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 pr-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>

                        {/* Acción directa (WhatsApp o Ver) */}
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.phone && (
                              <button
                                onClick={() => handleOpenWhatsApp(order)}
                                className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                title="Abrir chat en WhatsApp"
                              >
                                <FaWhatsapp size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => router.push('/admin/orders')}
                              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Ver orden en el panel de órdenes"
                            >
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Columna Derecha (4 cols): Accesos Rápidos & Repuestos Críticos */}
        <div className="lg:col-span-4 space-y-6">
          {/* Widget 1: Centro de Accesos Rápidos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="w-1 h-5 rounded-full bg-[#0A2A66] inline-block" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Accesos Clave
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => router.push('/admin/products')}
                className="flex flex-col items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center mb-2">
                  <Package size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Repuestos
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Catálogo y stock</span>
              </button>

              <button
                onClick={() => router.push('/admin/orders')}
                className="flex flex-col items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-2">
                  <ShoppingBag size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Órdenes
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Despachos y Wompi</span>
              </button>

              <button
                onClick={() => router.push('/admin/shipping')}
                className="flex flex-col items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mb-2">
                  <Truck size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Tarifas Envíos
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Reglas Colombia</span>
              </button>

              <button
                onClick={() => router.push('/admin/meli')}
                className="flex flex-col items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-left transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 flex items-center justify-center mb-2">
                  <Boxes size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Mercado Libre
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Sincronización</span>
              </button>
            </div>
          </div>

          {/* Widget 2: Repuestos Críticos (Bajo Stock o Agotados) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-rose-500 inline-block" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Stock Crítico
                </h2>
              </div>
              <button
                onClick={() => router.push('/admin/products')}
                className="text-xs font-semibold text-[#0A2A66] dark:text-sky-400 hover:underline"
              >
                Inventario
              </button>
            </div>

            {stats.criticalStockProducts && stats.criticalStockProducts.length > 0 ? (
              <div className="space-y-3">
                {stats.criticalStockProducts.map((p) => {
                  const isZero = (p.stock ?? 0) === 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push('/admin/products')}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 transition-all cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden relative">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Package size={16} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#0A2A66] dark:group-hover:text-sky-400">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {formatCurrency(p.price)}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {isZero ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                            Agotado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                            {p.stock} un.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  ¡Excelente! No hay repuestos con stock crítico
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

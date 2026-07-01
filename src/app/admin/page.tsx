'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

type DashboardStats = {
  totalProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalUsers: number;
  recentOrders: {
    id: number;
    referenceCode: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  PENDING:   { dot: 'bg-amber-400',   text: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  APPROVED:  { dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  REJECTED:  { dot: 'bg-red-400',     text: 'text-red-700 dark:text-red-300',       bg: 'bg-red-50 dark:bg-red-900/20' },
  SHIPPED:   { dot: 'bg-blue-400',    text: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
  DELIVERED: { dot: 'bg-teal-400',    text: 'text-teal-700 dark:text-teal-300',     bg: 'bg-teal-50 dark:bg-teal-900/20' },
  CANCELLED: { dot: 'bg-gray-400',    text: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-100 dark:bg-gray-800/40' },
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
      if (!res.ok) throw new Error('Error cargando datos del dashboard');
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-xl bg-gray-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-gray-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 rounded-2xl bg-gray-200 dark:bg-slate-800" />
          <div className="lg:col-span-2 h-72 rounded-2xl bg-gray-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/50 rounded-2xl p-8 text-center shadow-lg max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="text-red-500" size={28} />
          </div>
          <p className="text-red-700 dark:text-red-300 font-semibold mb-4">{error}</p>
          <button
            onClick={loadDashboard}
            className="px-5 py-2.5 bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    {
      label: 'Ingresos Totales',
      value: `$${stats.totalRevenue.toLocaleString('es-CO')}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-400/20',
      sub: 'Acumulado',
      subIcon: TrendingUp,
    },
    {
      label: 'Órdenes',
      value: stats.totalOrders,
      sub: `${stats.pendingOrders} pendientes`,
      icon: PackageSearch,
      gradient: 'from-[#0A2A66] to-[#2E5FA7]',
      iconBg: 'bg-blue-400/20',
      onClick: () => router.push('/admin/orders'),
    },
    {
      label: 'Productos',
      value: stats.totalProducts,
      sub: stats.lowStockProducts > 0 ? `⚠ ${stats.lowStockProducts} stock bajo` : 'Stock saludable',
      icon: Package,
      gradient: 'from-violet-500 to-purple-700',
      iconBg: 'bg-violet-400/20',
      onClick: () => router.push('/admin/products'),
      alert: stats.lowStockProducts > 0,
    },
    {
      label: 'Usuarios',
      value: stats.totalUsers,
      sub: 'Registrados',
      icon: Users,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-400/20',
      onClick: () => router.push('/admin/users'),
    },
  ];

  const quickActions = [
    { label: 'Gestionar Productos', icon: Package, href: '/admin/products', desc: 'Inventario y catálogo', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Ver Órdenes', icon: ShoppingBag, href: '/admin/orders', desc: 'Gestión de pedidos', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Usuarios', icon: Users, href: '/admin/users', desc: 'Clientes y roles', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Promociones', icon: BadgePercent, href: '/admin/codes', desc: 'Códigos y descuentos', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Combos', icon: Layers, href: '/admin/combos', desc: 'Paquetes de productos', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { label: 'Analytics', icon: Activity, href: '/admin/analytics', desc: 'Métricas y reportes', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  return (
    <div className="space-y-6">
      {/* —— Page Header —— */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 capitalize">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm font-medium"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* —— KPI Cards —— */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            onClick={kpi.onClick}
            disabled={!kpi.onClick}
            className={`relative group overflow-hidden text-left rounded-2xl shadow-sm transition-all duration-300 ${
              kpi.onClick
                ? 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-md'
                : 'cursor-default'
            }`}
          >
            <div className={`bg-gradient-to-br ${kpi.gradient} p-5 h-full`}>
              {/* Icon */}
              <div className={`inline-flex w-11 h-11 rounded-xl ${kpi.iconBg} items-center justify-center mb-4`}>
                <kpi.icon className="text-white" size={22} />
              </div>

              {/* Alert badge */}
              {kpi.alert && (
                <span className="absolute top-3 right-3 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                  <AlertTriangle size={12} className="text-white" />
                </span>
              )}

              {/* Arrow on hover */}
              {kpi.onClick && (
                <ArrowUpRight
                  size={16}
                  className="absolute top-3 right-3 text-white/50 group-hover:text-white transition-colors"
                />
              )}

              <p className="text-white/70 text-xs font-medium mb-1 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-white text-2xl font-bold leading-none mb-1.5">{kpi.value}</p>
              {kpi.sub && (
                <p className="text-white/60 text-xs flex items-center gap-1">
                  {kpi.sub}
                </p>
              )}

              {/* Decorative blob */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/5" />
              <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            </div>
          </button>
        ))}
      </div>

      {/* —— Quick Actions + Recent Orders —— */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0A2A66] to-[#2E5FA7] inline-block" />
            Acceso Rápido
          </h3>
          <div className="space-y-1.5">
            {quickActions.map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="w-full group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-all duration-200"
              >
                <span className={`flex-shrink-0 w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center`}>
                  <action.icon size={17} className={action.color} />
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{action.label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{action.desc}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0A2A66] to-[#2E5FA7] inline-block" />
              Órdenes Recientes
            </h3>
            <button
              onClick={() => router.push('/admin/orders')}
              className="flex items-center gap-1 text-xs font-semibold text-[#2E5FA7] dark:text-blue-400 hover:underline"
            >
              Ver todas
              <ChevronRight size={13} />
            </button>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Clock size={26} className="opacity-60" />
              </div>
              <p className="text-sm font-medium">Sin órdenes aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-sm min-w-[460px]">
                <thead>
                  <tr className="text-left">
                    <th className="pb-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="pb-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="pb-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="pb-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/80">
                  {stats.recentOrders.map((order) => {
                    const sc = STATUS_CONFIG[order.status];
                    return (
                      <tr key={order.id} className="group hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold text-gray-800 dark:text-slate-100 truncate max-w-[160px]">{order.customerName}</p>
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                            #{order.referenceCode.slice(0, 10)}
                          </p>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="font-bold text-gray-900 dark:text-white">
                            ${order.total.toLocaleString('es-CO')}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          {sc ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sc.bg} ${sc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {STATUS_LABELS[order.status]}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">{order.status}</span>
                          )}
                        </td>
                        <td className="py-3.5 text-xs text-gray-400 dark:text-slate-500 hidden sm:table-cell">
                          {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  SHIPPED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DELIVERED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [productsRes, ordersRes, usersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/orders'),
          fetch('/api/users'),
        ]);

        if (!productsRes.ok || !ordersRes.ok || !usersRes.ok) {
          throw new Error('Error cargando datos del dashboard');
        }

        // Normalizar posibles respuestas paginadas ({ items, total })
        const prodJson = await productsRes.json();
        const products = Array.isArray(prodJson) ? prodJson : prodJson?.items ?? [];

        const ordersJson = await ordersRes.json();
        const orders = Array.isArray(ordersJson) ? ordersJson : ordersJson?.items ?? [];

        const usersJson = await usersRes.json();
        const users = Array.isArray(usersJson) ? usersJson : usersJson?.items ?? [];

        const lowStock = (products || []).filter(
          (p: { stock?: number }) => typeof p.stock === 'number' && p.stock <= 5
        );

        const pendingOrders = (orders || []).filter(
          (o: { status: string }) => o.status === 'PENDING'
        );

        const totalRevenue = orders
          .filter((o: { status: string }) => o.status !== 'CANCELLED' && o.status !== 'REJECTED')
          .reduce((acc: number, o: { total: number }) => acc + o.total, 0);

        const recent = orders.slice(0, 5).map((o: {
          id: number;
          referenceCode: string;
          customerName: string;
          total: number;
          status: string;
          createdAt: string;
        }) => ({
          id: o.id,
          referenceCode: o.referenceCode,
          customerName: o.customerName,
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
        }));

        setStats({
          totalProducts: products.length,
          lowStockProducts: lowStock.length,
          totalOrders: orders.length,
          pendingOrders: pendingOrders.length,
          totalRevenue,
          totalUsers: users.length,
          recentOrders: recent,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 text-red-500" size={32} />
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
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
      label: 'Ingresos',
      value: `$${stats.totalRevenue.toLocaleString('es-CO')}`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Órdenes',
      value: stats.totalOrders,
      sub: `${stats.pendingOrders} pendientes`,
      icon: PackageSearch,
      color: 'text-[#0A2A66] dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      onClick: () => router.push('/admin/orders'),
    },
    {
      label: 'Productos',
      value: stats.totalProducts,
      sub: stats.lowStockProducts > 0 ? `${stats.lowStockProducts} stock bajo` : undefined,
      icon: Package,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
      onClick: () => router.push('/admin/products'),
      alert: stats.lowStockProducts > 0,
    },
    {
      label: 'Usuarios',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      onClick: () => router.push('/admin/users'),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
          Dashboard
        </h2>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            onClick={kpi.onClick}
            disabled={!kpi.onClick}
            className={`relative text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm transition-all ${kpi.onClick ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
          >
            {kpi.alert && (
              <span className="absolute top-3 right-3">
                <AlertTriangle className="text-amber-500" size={18} />
              </span>
            )}
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${kpi.bg} mb-3`}>
              <kpi.icon className={kpi.color} size={20} />
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{kpi.value}</p>
            {kpi.sub && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{kpi.sub}</p>
            )}
          </button>
        ))}
      </div>

      {/* Quick Actions + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">
            Acciones rápidas
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Gestionar productos', icon: Package, href: '/admin/products' },
              { label: 'Ver órdenes', icon: PackageSearch, href: '/admin/orders' },
              { label: 'Administrar usuarios', icon: Users, href: '/admin/users' },
              { label: 'Códigos y promociones', icon: BadgePercent, href: '/admin/codes' },
            ].map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                <action.icon size={18} className="text-gray-400 dark:text-slate-500" />
                {action.label}
                <TrendingUp size={14} className="ml-auto text-gray-300 dark:text-slate-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
              Órdenes recientes
            </h3>
            <button
              onClick={() => router.push('/admin/orders')}
              className="text-sm text-[#0A2A66] dark:text-blue-400 hover:underline"
            >
              Ver todas
            </button>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-400 dark:text-slate-500">
              <Clock className="mx-auto mb-2" size={32} />
              <p>No hay órdenes aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="text-gray-700 dark:text-slate-300">
                      <td className="py-3 pr-4">
                        <p className="font-medium truncate max-w-[150px]">{order.customerName}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 font-mono truncate max-w-[120px]">
                          {order.referenceCode.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        ${order.total.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400 dark:text-slate-500 hidden sm:table-cell">
                        {new Date(order.createdAt).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


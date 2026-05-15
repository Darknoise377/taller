"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { formatCurrency } from "@/utils/formatCurrency";

interface OrderProduct {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; imageUrl: string | null } | null;
}

interface Order {
  id: string;
  referenceCode: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
  products: OrderProduct[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  PAID: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function PedidosPage() {
  useCustomerAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    // Give the context a moment to restore the session
    const timer = setTimeout(async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) {
          router.replace("/cuenta/login");
          return;
        }

        const res = await fetch("/api/cuenta/pedidos", { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/cuenta/login");
            return;
          }
          throw new Error("Error cargando pedidos");
        }
        const data = (await res.json()) as Order[];
        setOrders(data);
      } catch {
        setError("No se pudieron cargar los pedidos. Intenta más tarde.");
      } finally {
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  if (loading) {
    return (
      <div aria-label="Cargando pedidos" aria-busy="true">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-6 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#0b0a1f] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 animate-pulse"
            >
              <div className="flex justify-between mb-4">
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
                <div className="h-3 w-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        aria-live="assertive"
        className="text-center py-12 text-red-600 dark:text-red-400"
      >
        {error}
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0A2A66] dark:text-slate-100 mb-6">Mis pedidos</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-slate-400">
          <p className="mb-4">Aún no tienes pedidos.</p>
          <Link
            href="/products"
            className="px-5 py-2.5 rounded-lg bg-[#0A2A66] text-white text-sm font-medium hover:bg-[#0A2A66]/90 transition-colors"
          >
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-[#0b0a1f] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Ref. #{order.referenceCode}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"}`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <ul className="space-y-1 mb-3">
                {order.products.map((p) => (
                  <li key={p.id} className="text-sm text-gray-700 dark:text-slate-300">
                    {p.product?.name ?? "Producto"} × {p.quantity}
                  </li>
                ))}
              </ul>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-800">
                <span className="text-sm text-gray-500 dark:text-slate-400">Total</span>
                <span className="font-bold text-[#0A2A66] dark:text-slate-100">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

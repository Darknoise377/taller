"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Truck,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface OrderProduct {
  id: number;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    slug: string | null;
  } | null;
}

interface OrderCombo {
  id: number;
  quantity: number;
  unitPrice: number;
  combo: {
    id: string;
    name: string;
    imageUrl: string | null;
    slug: string;
  };
}

interface OrderDetail {
  id: number;
  referenceCode: string;
  status: string;
  total: number;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  // Shipping
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  city: string;
  department: string | null;
  postalCode: string | null;
  // Tracking
  trackingNumber: string | null;
  trackingUrl: string | null;
  // Items
  products: OrderProduct[];
  orderCombos: OrderCombo[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  DECLINED: "Rechazado",
  SHIPPED: "Enviado",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  DECLINED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  SHIPPED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const PAYMENT_LABEL: Record<string, string> = {
  CONTRAENTREGA: "Contra entrega",
  PAYU: "PayU",
  WOMPI: "Wompi",
  MERCADO_LIBRE: "Mercado Libre",
};

export default function PedidoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) {
          router.replace("/cuenta/login");
          return;
        }

        const res = await fetch(`/api/cuenta/pedidos/${params.id}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/cuenta/login");
            return;
          }
          if (res.status === 404) {
            setError("Pedido no encontrado.");
          } else {
            throw new Error("Error cargando pedido");
          }
          return;
        }
        const data = (await res.json()) as OrderDetail;
        setOrder(data);
      } catch {
        setError("No se pudo cargar el pedido. Intenta más tarde.");
      } finally {
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Cargando pedido">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-16 space-y-4">
        <p role="alert" className="text-red-600 dark:text-red-400">
          {error ?? "Pedido no encontrado."}
        </p>
        <Link
          href="/cuenta/pedidos"
          className="inline-flex items-center gap-2 text-sm text-[#0A2A66] dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a mis pedidos
        </Link>
      </div>
    );
  }

  const hasTracking = !!order.trackingNumber;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#0A2A66] dark:text-slate-100">
            Pedido #{order.referenceCode.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {new Date(order.createdAt).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${
            STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Tracking banner */}
      {hasTracking && (
        <div className="flex items-center justify-between gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Tu pedido va en camino
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Guía: {order.trackingNumber}
              </p>
            </div>
          </div>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              Rastrear
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Products */}
      <section className="bg-white dark:bg-[#0b0a1f] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <Package className="w-4 h-4 text-[#0A2A66] dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Productos ({order.products.length + order.orderCombos.length})
          </h2>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {order.products.map((item) => {
            const href = item.product
              ? `/products/${item.product.slug ?? item.product.id}`
              : null;
            return (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                {/* Image */}
                <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {item.product?.imageUrl ? (
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  {href ? (
                    <Link
                      href={href}
                      className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-[#0A2A66] dark:hover:text-blue-400 line-clamp-1 transition-colors"
                    >
                      {item.product?.name ?? "Producto"}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                      {item.product?.name ?? "Producto"}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {formatCurrency(item.unitPrice)} × {item.quantity}
                  </p>
                </div>
                {/* Subtotal */}
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </p>
              </li>
            );
          })}

          {order.orderCombos.map((item) => (
            <li key={`combo-${item.id}`} className="flex items-center gap-3 px-5 py-3">
              {/* Image */}
              <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                {item.combo.imageUrl ? (
                  <Image
                    src={item.combo.imageUrl}
                    alt={item.combo.name}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/combos/${item.combo.slug}`}
                  className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-[#0A2A66] dark:hover:text-blue-400 line-clamp-1 transition-colors"
                >
                  {item.combo.name}
                </Link>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Combo · {formatCurrency(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              {/* Subtotal */}
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                {formatCurrency(item.unitPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        {/* Total */}
        <div className="flex justify-between items-center px-5 py-4 bg-slate-50 dark:bg-[#0d0c22] border-t border-gray-100 dark:border-slate-800">
          <span className="text-sm text-gray-500 dark:text-slate-400 font-medium">Total</span>
          <span className="text-lg font-bold text-[#0A2A66] dark:text-slate-100">
            {formatCurrency(order.total)}
          </span>
        </div>
      </section>

      {/* Shipping & Payment */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Shipping address */}
        <section className="bg-white dark:bg-[#0b0a1f] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0A2A66] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Dirección de envío
            </h2>
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-400 space-y-0.5">
            <p className="font-medium text-slate-800 dark:text-slate-200">{order.customerName}</p>
            <p>{order.address}</p>
            <p>
              {order.city}
              {order.department ? `, ${order.department}` : ""}
              {order.postalCode ? ` · CP ${order.postalCode}` : ""}
            </p>
            <p>{order.phone}</p>
            <p className="text-xs text-gray-400">{order.customerEmail}</p>
          </div>
        </section>

        {/* Payment */}
        <section className="bg-white dark:bg-[#0b0a1f] rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#0A2A66] dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Pago
            </h2>
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-300">Método: </span>
              {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-300">Estado: </span>
              <span
                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                  STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </p>
          </div>
        </section>
      </div>

      {/* Back link */}
      <Link
        href="/cuenta/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-[#0A2A66] dark:hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Ver todos mis pedidos
      </Link>
    </div>
  );
}

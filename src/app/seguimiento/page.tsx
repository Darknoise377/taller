"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  TruckIcon,
  ClockIcon,
  XCircleIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

interface OrderStatus {
  referenceCode: string;
  status: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType; step: number }
> = {
  PENDING: {
    label: "Pendiente de pago",
    color: "text-yellow-600 dark:text-yellow-400",
    icon: ClockIcon,
    step: 1,
  },
  PAID: {
    label: "Pago recibido",
    color: "text-blue-600 dark:text-blue-400",
    icon: CurrencyDollarIcon,
    step: 2,
  },
  SHIPPED: {
    label: "En camino",
    color: "text-purple-600 dark:text-purple-400",
    icon: TruckIcon,
    step: 3,
  },
  DELIVERED: {
    label: "Entregado",
    color: "text-green-600 dark:text-green-400",
    icon: CheckCircleIcon,
    step: 4,
  },
  CANCELLED: {
    label: "Cancelado",
    color: "text-red-600 dark:text-red-400",
    icon: XCircleIcon,
    step: 0,
  },
};

const STEPS = [
  { key: "PENDING", label: "Pendiente", step: 1 },
  { key: "PAID", label: "Pagado", step: 2 },
  { key: "SHIPPED", label: "Enviado", step: 3 },
  { key: "DELIVERED", label: "Entregado", step: 4 },
];

const PROGRESS_WIDTH: Record<number, string> = {
  1: "w-0",
  2: "w-1/3",
  3: "w-2/3",
  4: "w-full",
};

export default function SeguimientoPage() {
  const [refCode, setRefCode] = useState("");
  const [result, setResult] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = refCode.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/orders/status/${encodeURIComponent(code)}`);
      if (res.status === 404) {
        setError("No encontramos ningún pedido con ese código. Verifica que esté escrito correctamente.");
        return;
      }
      if (!res.ok) {
        setError("Ocurrió un error al consultar el pedido. Intenta de nuevo.");
        return;
      }
      const data: OrderStatus = await res.json();
      setResult(data);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setRefCode("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const config = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.PENDING) : null;
  const isCancelled = result?.status === "CANCELLED";
  const currentStep = config?.step ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070617] flex flex-col items-center justify-start px-4 py-12 sm:py-20">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0A2A66]/10 dark:bg-[#2E5FA7]/20 mb-4">
            <TruckIcon className="w-7 h-7 text-[#0A2A66] dark:text-[#5B9BD5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Seguimiento de pedido
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ingresa el código de referencia que recibiste en tu correo al comprar.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <label
            htmlFor="refcode"
            className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
          >
            Código de referencia
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="refcode"
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase())}
              placeholder="Ej: AR-20260515-XXXX"
              autoComplete="off"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-[#070617] text-slate-900 dark:text-slate-100 text-sm font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A2A66] dark:focus:ring-[#2E5FA7]"
            />
            <button
              type="submit"
              disabled={loading || !refCode.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2A66] hover:bg-[#0A2A66]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>

        {/* Result */}
        {result && config && (
          <div className="mt-4 bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-5">
            {/* Status badge */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide mb-1">
                  Pedido
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                  #{result.referenceCode}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 font-semibold text-sm ${config.color}`}>
                <config.icon className="w-5 h-5" />
                {config.label}
              </div>
            </div>

            {/* Progress bar (only for non-cancelled) */}
            {!isCancelled && (
              <div>
                <div className="flex justify-between mb-1.5">
                  {STEPS.map(({ key, label, step }) => (
                    <div key={key} className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          step <= currentStep
                            ? "bg-[#0A2A66] text-white dark:bg-[#2E5FA7]"
                            : "bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600"
                        }`}
                      >
                        {step}
                      </div>
                      <span
                        className={`text-[10px] font-medium text-center leading-tight ${
                          step <= currentStep
                            ? "text-[#0A2A66] dark:text-[#5B9BD5]"
                            : "text-gray-400 dark:text-slate-600"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Connector line */}
                <div className="relative flex items-center px-3.5 -mt-8 mb-6 pointer-events-none">
                  <div className="absolute left-3.5 right-3.5 h-0.5 bg-gray-200 dark:bg-slate-800 top-3.5 z-0" />
                  <div
                    className={`absolute left-3.5 h-0.5 bg-[#0A2A66] dark:bg-[#2E5FA7] top-3.5 z-0 transition-all duration-500 ${PROGRESS_WIDTH[currentStep] ?? "w-0"}`}
                  />
                </div>
              </div>
            )}

            {isCancelled && (
              <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
                Este pedido fue cancelado. Si tienes dudas, contáctanos por WhatsApp.
              </p>
            )}

            {/* Last update */}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Última actualización:{" "}
              {new Date(result.updatedAt).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`https://wa.me/573015271104?text=${encodeURIComponent(
                  `Hola, quiero consultar mi pedido con referencia #${result.referenceCode}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-semibold transition-colors"
              >
                Consultar por WhatsApp
              </a>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Buscar otro pedido
              </button>
            </div>
          </div>
        )}

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 space-x-3">
          <Link href="/products" className="hover:text-[#0A2A66] dark:hover:text-slate-300 transition-colors">
            Ver productos
          </Link>
          <span>·</span>
          <Link href="/cuenta/login" className="hover:text-[#0A2A66] dark:hover:text-slate-300 transition-colors">
            Iniciar sesión
          </Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-[#0A2A66] dark:hover:text-slate-300 transition-colors">
            Contacto
          </Link>
        </div>
      </div>
    </div>
  );
}

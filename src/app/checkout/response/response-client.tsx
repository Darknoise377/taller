"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

type PaymentStatus = "APPROVED" | "DECLINED" | "PENDING" | "UNKNOWN";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573000000000";

const STEPS_APPROVED = [
  { emoji: "✅", label: "Pago confirmado", done: true },
  { emoji: "📦", label: "Preparando tu pedido", done: false },
  { emoji: "🚚", label: "En camino", done: false },
  { emoji: "🎉", label: "¡Entregado!", done: false },
];

const STEPS_PENDING = [
  { emoji: "⏳", label: "Verificando pago", done: false },
  { emoji: "📦", label: "Preparando tu pedido", done: false },
  { emoji: "🚚", label: "En camino", done: false },
  { emoji: "🎉", label: "¡Entregado!", done: false },
];

export default function ResponseClient() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<PaymentStatus>("UNKNOWN");
  const [loading, setLoading] = useState(true);

  const referenceCode = useMemo(() => searchParams.get("referenceCode"), [searchParams]);
  const transactionId = useMemo(() => searchParams.get("id"), [searchParams]);
  const provider = useMemo(() => searchParams.get("provider"), [searchParams]);
  const wompiEnv = useMemo(() => searchParams.get("env"), [searchParams]);

  useEffect(() => {
    const isWompi = provider === "wompi" || !!transactionId;

    if (isWompi && transactionId && referenceCode) {
      // ── Flujo Wompi: verificación server-side ──────────────────────────────
      fetch("/api/wompi/update-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, referenceCode, env: wompiEnv }),
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.status) setStatus(data.status as PaymentStatus);
          else setStatus("UNKNOWN");
        })
        .catch(() => setStatus("UNKNOWN"))
        .finally(() => setLoading(false));
    } else {
      // ── Flujo PayU (legado): parámetros de URL ─────────────────────────────
      const state = searchParams.get("transactionState");
      let mapped: PaymentStatus = "UNKNOWN";
      if (state === "4") mapped = "APPROVED";
      else if (state === "6") mapped = "DECLINED";
      else if (state === "7") mapped = "PENDING";

      if (mapped !== "UNKNOWN") {
        setStatus(mapped);
        setLoading(false);
        return;
      }

      if (referenceCode) {
        fetch(`/api/orders/status/${encodeURIComponent(referenceCode)}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.status) setStatus(data.status as PaymentStatus);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [searchParams, referenceCode, transactionId, provider, wompiEnv]);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola! Acabo de realizar un pedido con referencia #${referenceCode ?? "—"} y quiero consultarlo.`
  )}`;

  const content = (() => {
    if (loading) {
      return (
        <div className="text-center py-4">
          <ArrowPathIcon className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
          <p className="text-lg text-slate-600 dark:text-slate-300">Verificando tu pago...</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Esto tomará solo un momento</p>
        </div>
      );
    }

    switch (status) {
      case "APPROVED":
        return (
          <div>
            {/* Encabezado */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-1">
                ¡Pago confirmado!
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Orden{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  #{referenceCode}
                </span>
              </p>
            </div>

            {/* Pasos */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                ¿Qué sigue?
              </p>
              <div className="space-y-2">
                {STEPS_APPROVED.map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-lg leading-none">{step.emoji}</span>
                    <span
                      className={`text-sm ${
                        step.done
                          ? "font-semibold text-slate-800 dark:text-slate-100"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.done && (
                      <span className="ml-auto text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                        Listo
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm text-center mb-6">
              Te enviamos un correo con todos los detalles de tu pedido.
            </p>

            {/* WhatsApp CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#1da851] transition mb-4"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.116 1.533 5.846L.057 23.59a.75.75 0 0 0 .952.899l5.943-1.55A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.744 9.744 0 0 1-5.068-1.418l-.363-.216-3.532.923.94-3.44-.236-.375A9.737 9.737 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
              </svg>
              Consultar por WhatsApp
            </a>
          </div>
        );

      case "DECLINED":
        return (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircleIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
              Pago rechazado
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-2">
              La orden{" "}
              <span className="font-semibold">#{referenceCode}</span> no pudo ser procesada.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Por favor intenta nuevamente o usa otro método de pago.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#1da851] transition mb-4"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.116 1.533 5.846L.057 23.59a.75.75 0 0 0 .952.899l5.943-1.55A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.744 9.744 0 0 1-5.068-1.418l-.363-.216-3.532.923.94-3.44-.236-.375A9.737 9.737 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
              </svg>
              ¿Necesitas ayuda?
            </a>
          </div>
        );

      case "PENDING":
        return (
          <div>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h1 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                Pago en proceso
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Orden{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  #{referenceCode}
                </span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Estado del pedido
              </p>
              <div className="space-y-2">
                {STEPS_PENDING.map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="text-lg leading-none">{step.emoji}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm text-center mb-4">
              Cuando recibamos la confirmación de la pasarela de pago, te notificaremos por correo electrónico.
            </p>
            <Link
              href={`/seguimiento?ref=${encodeURIComponent(referenceCode ?? '')}`}
              className="flex items-center justify-center gap-2 w-full border border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#5B9BD5] px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#0A2A66]/5 dark:hover:bg-[#2E5FA7]/10 transition"
            >
              Rastrear mi pedido
            </Link>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <XCircleIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
              Estado desconocido
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No pudimos determinar el estado del pago.
            </p>
          </div>
        );
    }
  })();

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#070617] dark:to-[#0b0a1f]">
      <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-2xl p-6 md:p-10 max-w-md w-full border border-gray-100 dark:border-slate-800">
        <div className="transition-opacity duration-200">{content}</div>

        {!loading && (
          <div className="flex justify-center gap-3 mt-4">
            <Link
              href="/"
              className="flex items-center bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition shadow-lg"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
              Inicio
            </Link>
            <Link
              href="/products"
              className="flex items-center border-2 border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#2E5FA7] px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#0A2A66]/5 dark:hover:bg-[#2E5FA7]/10 transition"
            >
              <ShoppingBagIcon className="w-4 h-4 mr-1.5" />
              Seguir comprando
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

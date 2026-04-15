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

export default function ResponseClient() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<PaymentStatus>("UNKNOWN");
  const [loading, setLoading] = useState(true);

  const referenceCode = useMemo(() => {
    return searchParams.get("referenceCode");
  }, [searchParams]);

  useEffect(() => {
    const state = searchParams.get("transactionState");

    let mapped: PaymentStatus = "UNKNOWN";
    if (state === "4") mapped = "APPROVED";
    else if (state === "6") mapped = "DECLINED";
    else if (state === "7") mapped = "PENDING";

    setStatus(mapped);

    // Verificar en backend el estado real por referenceCode
    if (referenceCode) {
      fetch(`/api/orders/status/${encodeURIComponent(referenceCode)}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.status) setStatus(data.status);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [searchParams, referenceCode]);

  const content = (() => {
    if (loading) {
      return (
        <div className="text-center">
          <ArrowPathIcon className="w-16 h-16 text-slate-400 mx-auto mb-4 animate-spin" />
          <p className="text-lg text-slate-600 dark:text-slate-300">Verificando tu pago...</p>
        </div>
      );
    }

    switch (status) {
      case "APPROVED":
        return (
          <div className="text-center">
            <CheckCircleIcon className="w-24 h-24 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
              ¡Pago exitoso!
            </h1>
            <p className="text-lg text-slate-700 dark:text-slate-200 mb-4">
              Tu orden <span className="font-semibold">#{referenceCode}</span> ha sido confirmada.
            </p>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Recibirás un correo con todos los detalles.
            </p>
          </div>
        );
      case "DECLINED":
        return (
          <div className="text-center">
            <XCircleIcon className="w-24 h-24 text-red-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-red-700 dark:text-red-400 mb-2">
              Pago rechazado
            </h1>
            <p className="text-lg text-slate-700 dark:text-slate-200 mb-4">
              Lo sentimos, tu orden <span className="font-semibold">#{referenceCode}</span> no pudo ser procesada.
            </p>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Por favor intenta nuevamente o usa otro método de pago.
            </p>
          </div>
        );
      case "PENDING":
        return (
          <div className="text-center">
            <ClockIcon className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              Pago en proceso
            </h1>
            <p className="text-lg text-slate-700 dark:text-slate-200 mb-4">
              Tu orden <span className="font-semibold">#{referenceCode}</span> está pendiente de confirmación.
            </p>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Una vez recibamos la confirmación de PayU, te notificaremos por correo electrónico.
            </p>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <XCircleIcon className="w-24 h-24 text-slate-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">
              Estado desconocido
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
              No pudimos determinar el estado del pago.
            </p>
          </div>
        );
    }
  })();

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#070617] dark:to-[#0b0a1f]">
      <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-2xl p-8 md:p-12 max-w-lg w-full border border-gray-100 dark:border-slate-800">
        <div className="transition-opacity duration-200">{content}</div>

        <div className="flex justify-center gap-4 mt-8">
          <Link href="/" className="flex items-center bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white px-6 py-3 rounded-full text-lg font-semibold hover:opacity-90 transition shadow-lg">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Ir al inicio
          </Link>
          <Link href="/products" className="flex items-center border-2 border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#2E5FA7] px-6 py-3 rounded-full text-lg font-semibold hover:bg-[#0A2A66]/5 dark:hover:bg-[#2E5FA7]/10 transition">
            <ShoppingBagIcon className="w-5 h-5 mr-2" />
            Seguir comprando
          </Link>
        </div>
      </div>
    </main>
  );
}

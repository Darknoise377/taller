"use client";

import React, { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caracteres mínimo", ok: password.length >= 8 },
    { label: "Una mayúscula", ok: /[A-Z]/.test(password) },
    { label: "Una minúscula", ok: /[a-z]/.test(password) },
    { label: "Un número", ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {checks.map(({ label, ok }) => (
        <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-slate-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-600 dark:text-red-400 text-sm">
          El enlace es inválido o ya expiró.
        </p>
        <Link href="/cuenta/forgot-password" className="text-[#0A2A66] dark:text-blue-400 text-sm font-medium hover:underline">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError("La contraseña no cumple los requisitos");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error al restablecer la contraseña");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/cuenta/login"), 3000);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="w-14 h-14 text-green-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          ¡Contraseña actualizada!
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Serás redirigido al login en unos segundos…
        </p>
        <Link href="/cuenta/login" className="block text-sm text-[#0A2A66] dark:text-blue-400 font-medium hover:underline">
          Ir al login ahora
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#0A2A66] dark:text-slate-100 mb-2 text-center">
        Nueva contraseña
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
        Elige una contraseña segura para tu cuenta.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[#0A2A66] text-white font-semibold text-sm hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Guardando…" : "Guardar nueva contraseña"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 p-8">
          <Suspense fallback={<div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-[#0A2A66] border-t-transparent rounded-full animate-spin" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

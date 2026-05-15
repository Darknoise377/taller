"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error al enviar");
        return;
      }
      setSent(true);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 p-8">

          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-14 h-14 text-green-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                Revisa tu correo
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Si el correo <strong className="text-gray-700 dark:text-slate-300">{email}</strong> está
                registrado, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                El enlace expira en 1 hora.
              </p>
              <Link
                href="/cuenta/login"
                className="block mt-4 text-sm text-[#0A2A66] dark:text-blue-400 font-medium hover:underline"
              >
                ← Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#0A2A66] dark:text-slate-100 mb-2 text-center">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
                Ingresa tu email y te enviaremos un enlace para recuperarla.
              </p>

              {error && (
                <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1"><Mail size={13} /> Email</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-[#0A2A66] text-white font-semibold text-sm hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Enviando…" : "Enviar enlace de recuperación"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
                <Link href="/cuenta/login" className="text-[#0A2A66] dark:text-blue-400 font-medium hover:underline">
                  ← Volver al login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

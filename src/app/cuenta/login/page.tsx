"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

export default function LoginPage() {
  const { setUser } = useCustomerAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as { user?: { id: string; email: string; name?: string | null }; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email, name: data.user.name });
        router.push("/cuenta/pedidos");
      }
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
          <h1 className="text-2xl font-bold text-[#0A2A66] dark:text-slate-100 mb-6 text-center">
            Iniciar sesión
          </h1>

          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Email
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Contraseña
                </label>
                <Link href="/cuenta/forgot-password" className="text-xs text-[#0A2A66] dark:text-blue-400 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#0A2A66] text-white font-semibold text-sm hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors"
            >
              {loading ? "Entrando…" : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
            ¿No tienes cuenta?{" "}
            <Link href="/cuenta/registro" className="text-[#0A2A66] dark:text-blue-400 font-medium hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

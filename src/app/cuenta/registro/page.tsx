"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { Eye, EyeOff } from "lucide-react";
import { useCsrf } from "@/hooks/useCsrf";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caracteres mÃ­nimo", ok: password.length >= 8 },
    { label: "Una mayÃºscula", ok: /[A-Z]/.test(password) },
    { label: "Una minÃºscula", ok: /[a-z]/.test(password) },
    { label: "Un nÃºmero", ok: /\d/.test(password) },
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

export default function RegistroPage() {
  const { setUser } = useCustomerAuth();
  const router = useRouter();
  const { csrfFetch } = useCsrf();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseÃ±as no coinciden");
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError("La contraseÃ±a debe tener mÃ­nimo 8 caracteres, una mayÃºscula, una minÃºscula y un nÃºmero");
      return;
    }

    setLoading(true);

    try {
      const res = await csrfFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await res.json()) as { user?: { id: string; email: string; name?: string | null }; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Error al registrarse");
        return;
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email, name: data.user.name });
        router.push("/cuenta/pedidos");
      }
    } catch {
      setError("Error de conexiÃ³n. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-[#0b0a1f] rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 p-8">
          <h1 className="text-2xl font-bold text-[#0A2A66] dark:text-slate-100 mb-6 text-center">
            Crear cuenta
          </h1>

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-center"
            >
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
              />
            </div>

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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                ContraseÃ±a
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Ocultar contraseÃ±a" : "Mostrar contraseÃ±a"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Confirmar contraseÃ±a
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirm ? "Ocultar contraseÃ±a" : "Mostrar contraseÃ±a"}
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
              {loading ? "Creando cuentaâ€¦" : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
            Â¿Ya tienes cuenta?{" "}
            <Link href="/cuenta/login" className="text-[#0A2A66] dark:text-blue-400 font-medium hover:underline">
              Inicia sesiÃ³n
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

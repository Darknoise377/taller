"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, Save, KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
}

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

export default function PerfilPage() {
  const { user, setUser } = useCustomerAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Formulario perfil
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Formulario cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (user === undefined) return; // contexto cargando
    if (!user) {
      router.replace("/cuenta/login");
      return;
    }
    fetch("/api/cuenta/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [user, router]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const res = await fetch("/api/cuenta/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = (await res.json()) as { name?: string | null; error?: string };
      if (!res.ok) {
        setProfileMsg({ type: "err", text: data.error ?? "Error al guardar" });
        return;
      }
      setProfile((prev) => (prev ? { ...prev, name: data.name ?? null, phone: phone || null } : prev));
      setUser((prev) => (prev ? { ...prev, name: data.name } : prev));
      setProfileMsg({ type: "ok", text: "Perfil actualizado correctamente" });
    } catch {
      setProfileMsg({ type: "err", text: "Error de conexión" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "Las contraseñas nuevas no coinciden" });
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordMsg({ type: "err", text: "La contraseña no cumple los requisitos" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/cuenta/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPasswordMsg({ type: "err", text: data.error ?? "Error al cambiar contraseña" });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "ok", text: "Contraseña actualizada correctamente" });
    } catch {
      setPasswordMsg({ type: "err", text: "Error de conexión" });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0A2A66] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mi perfil</h1>

      {/* ── Datos personales ── */}
      <section className="bg-white dark:bg-[#0b0a1f] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-slate-200 mb-5">
          <User size={18} className="text-[#0A2A66] dark:text-blue-400" />
          Datos personales
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1"><Mail size={13} /> Email</span>
            </label>
            <input
              type="email"
              value={profile?.email ?? ""}
              readOnly
              aria-label="Email"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 text-sm cursor-not-allowed"
            />
          </div>

          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              <span className="flex items-center gap-1"><Phone size={13} /> Teléfono <span className="text-gray-400 font-normal">(opcional)</span></span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="3001234567"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
          </div>

          {profileMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${
              profileMsg.type === "ok"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            }`}>
              {profileMsg.type === "ok" && <CheckCircle size={15} />}
              {profileMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A2A66] text-white text-sm font-semibold hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors"
          >
            <Save size={15} />
            {savingProfile ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </section>

      {/* ── Cambiar contraseña ── */}
      <section className="bg-white dark:bg-[#0b0a1f] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-slate-200 mb-5">
          <KeyRound size={18} className="text-[#0A2A66] dark:text-blue-400" />
          Cambiar contraseña
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Contraseña actual */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
          </div>

          {/* Nueva contraseña */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={newPassword} />
          </div>

          {/* Confirmar */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

          {passwordMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${
              passwordMsg.type === "ok"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            }`}>
              {passwordMsg.type === "ok" && <CheckCircle size={15} />}
              {passwordMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={savingPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A2A66] text-white text-sm font-semibold hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors"
          >
            <KeyRound size={15} />
            {savingPassword ? "Actualizando…" : "Cambiar contraseña"}
          </button>
        </form>
      </section>

      {/* ── Info de cuenta ── */}
      {profile && (
        <p className="text-xs text-gray-400 dark:text-slate-600 text-center">
          Cuenta creada el{" "}
          {new Date(profile.createdAt).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

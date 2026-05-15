"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, Save, KeyRound, Eye, EyeOff, CheckCircle, MapPin, CreditCard } from "lucide-react";
import colombia from "@/data/colombia.json";

type ColombiaDepartment = { departamento: string; ciudades: string[] };
const colombiaData = colombia as unknown as ColombiaDepartment[];

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  postalCode: string | null;
  cedula: string | null;
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

  // Datos personales
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Dirección de envío
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [cedula, setCedula] = useState("");
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const deps = colombiaData.map((d) => d.departamento).sort();
    setDepartamentos(deps);
  }, []);

  useEffect(() => {
    if (department) {
      const dep = colombiaData.find((d) => d.departamento === department);
      setMunicipios(dep ? dep.ciudades.sort() : []);
      if (city && (!dep || !dep.ciudades.includes(city))) setCity("");
    } else {
      setMunicipios([]);
    }
  }, [department, city]);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) { router.replace("/cuenta/login"); return; }
    fetch("/api/cuenta/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setCity(data.city ?? "");
        setDepartment(data.department ?? "");
        setPostalCode(data.postalCode ?? "");
        setCedula(data.cedula ?? "");
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
        body: JSON.stringify({ name, phone, address, city, department, postalCode, cedula }),
      });
      const data = (await res.json()) as { name?: string | null; error?: string };
      if (!res.ok) { setProfileMsg({ type: "err", text: data.error ?? "Error al guardar" }); return; }
      setProfile((prev) => prev ? { ...prev, name: data.name ?? null, phone: phone || null, address: address || null, city: city || null, department: department || null, postalCode: postalCode || null, cedula: cedula || null } : prev);
      if (user) setUser({ ...user, name: data.name ?? null });
      setProfileMsg({ type: "ok", text: "Perfil actualizado correctamente" });
    } catch {
      setProfileMsg({ type: "err", text: "Error de conexión" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    setAddressMsg(null);
    setSavingAddress(true);
    try {
      const res = await fetch("/api/cuenta/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, city, department, postalCode, cedula }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setAddressMsg({ type: "err", text: data.error ?? "Error al guardar" }); return; }
      setProfile((prev) => prev ? { ...prev, address: address || null, city: city || null, department: department || null, postalCode: postalCode || null, cedula: cedula || null } : prev);
      setAddressMsg({ type: "ok", text: "Dirección guardada correctamente" });
    } catch {
      setAddressMsg({ type: "err", text: "Error de conexión" });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: "err", text: "Las contraseñas nuevas no coinciden" }); return; }
    if (!PASSWORD_REGEX.test(newPassword)) { setPasswordMsg({ type: "err", text: "La contraseña no cumple los requisitos" }); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/cuenta/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setPasswordMsg({ type: "err", text: data.error ?? "Error al cambiar contraseña" }); return; }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPasswordMsg({ type: "ok", text: "Contraseña actualizada correctamente" });
    } catch {
      setPasswordMsg({ type: "err", text: "Error de conexión" });
    } finally {
      setSavingPassword(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1";

  if (loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0A2A66] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* ── Header de perfil ── */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xl font-bold">
            {(profile?.name ?? profile?.email ?? "U")[0].toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {profile?.name ?? "Mi perfil"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{profile?.email}</p>
        </div>
      </div>

      {/* ── Datos personales ── */}
      <section className="bg-white dark:bg-[#0b0a1f] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-slate-200 mb-5">
          <User size={18} className="text-[#0A2A66] dark:text-blue-400" />
          Datos personales
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><Mail size={13} /> Email</span></label>
            <input type="email" value={profile?.email ?? ""} readOnly aria-label="Email"
              className={`${inputCls} cursor-not-allowed opacity-60`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className={labelCls}>Nombre completo</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label htmlFor="phone" className={labelCls}><span className="flex items-center gap-1"><Phone size={13} /> Teléfono <span className="text-gray-400 font-normal text-xs">(opcional)</span></span></label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="3001234567" className={inputCls} />
            </div>
          </div>

          {profileMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${profileMsg.type === "ok" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
              {profileMsg.type === "ok" && <CheckCircle size={15} />}
              {profileMsg.text}
            </p>
          )}
          <button type="submit" disabled={savingProfile} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A2A66] text-white text-sm font-semibold hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors">
            <Save size={15} />
            {savingProfile ? "Guardando…" : "Guardar datos"}
          </button>
        </form>
      </section>

      {/* ── Dirección de envío ── */}
      <section className="bg-white dark:bg-[#0b0a1f] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-slate-200 mb-1">
          <MapPin size={18} className="text-[#0A2A66] dark:text-blue-400" />
          Dirección de envío
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-500 mb-5">
          Se usará automáticamente al hacer un pedido
        </p>
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <div>
            <label htmlFor="address" className={labelCls}>Dirección</label>
            <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle 10 # 5-20, Apto 301" className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="department" className={labelCls}>Departamento</label>
              <select id="department" value={department} onChange={(e) => { setDepartment(e.target.value); setCity(""); }}
                className={inputCls}>
                <option value="">Selecciona un departamento</option>
                {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="city" className={labelCls}>Ciudad / Municipio</label>
              <select id="city" value={city} onChange={(e) => setCity(e.target.value)}
                disabled={!department} className={`${inputCls} disabled:opacity-50`}>
                <option value="">Selecciona una ciudad</option>
                {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="postalCode" className={labelCls}>Código postal <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
              <input id="postalCode" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                placeholder="110111" maxLength={10} className={inputCls} />
            </div>
            <div>
              <label htmlFor="cedula" className={labelCls}><span className="flex items-center gap-1"><CreditCard size={13} /> Cédula / NIT <span className="text-gray-400 font-normal text-xs">(opcional)</span></span></label>
              <input id="cedula" type="text" value={cedula} onChange={(e) => setCedula(e.target.value)}
                placeholder="1234567890" maxLength={15} className={inputCls} />
            </div>
          </div>

          {addressMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${addressMsg.type === "ok" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
              {addressMsg.type === "ok" && <CheckCircle size={15} />}
              {addressMsg.text}
            </p>
          )}
          <button type="submit" disabled={savingAddress} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A2A66] text-white text-sm font-semibold hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors">
            <Save size={15} />
            {savingAddress ? "Guardando…" : "Guardar dirección"}
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
          <div>
            <label htmlFor="currentPassword" className={labelCls}>Contraseña actual</label>
            <input id="currentPassword" type="password" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" className={inputCls} />
          </div>
          <div>
            <label htmlFor="newPassword" className={labelCls}>Nueva contraseña</label>
            <div className="relative">
              <input id="newPassword" type={showNew ? "text" : "password"} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password"
                className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={newPassword} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelCls}>Confirmar nueva contraseña</label>
            <div className="relative">
              <input id="confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password"
                className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {passwordMsg && (
            <p className={`text-sm rounded-lg px-3 py-2 flex items-center gap-2 ${passwordMsg.type === "ok" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
              {passwordMsg.type === "ok" && <CheckCircle size={15} />}
              {passwordMsg.text}
            </p>
          )}
          <button type="submit" disabled={savingPassword} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A2A66] text-white text-sm font-semibold hover:bg-[#0A2A66]/90 disabled:opacity-60 transition-colors">
            <KeyRound size={15} />
            {savingPassword ? "Actualizando…" : "Cambiar contraseña"}
          </button>
        </form>
      </section>

      {profile && (
        <p className="text-xs text-gray-400 dark:text-slate-600 text-center">
          Cuenta creada el{" "}
          {new Date(profile.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

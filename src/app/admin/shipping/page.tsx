"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Truck,
  Sparkles,
  Globe,
  Palette,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  DEFAULT_SHIPPING_CONFIG,
  type SeasonalThemeKey,
  type ShippingConfig,
  type ShippingRegion,
} from "@/config/shippingRates";

function formatCOP(n: number) {
  return "$" + n.toLocaleString("es-CO");
}

type ToastState = { ok: boolean; msg: string } | null;
type ShippingMode = "always_free" | "threshold";

const SEASON_OPTIONS: Array<{ value: SeasonalThemeKey; label: string }> = [
  { value: "none", label: "Sin temporada" },
  { value: "mundial_2026", label: "Mundial 2026" },
  { value: "independencia", label: "Independencia" },
  { value: "amor_amistad", label: "Amor y amistad" },
  { value: "black_week", label: "Black Week" },
  { value: "navidad", label: "Navidad" },
];

export default function ShippingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [regionsOpen, setRegionsOpen] = useState(false);

  const [config, setConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);

  const mode: ShippingMode = config.freeShippingAll ? "always_free" : "threshold";

  const setMode = (m: ShippingMode) =>
    setConfig((c) => ({ ...c, freeShippingAll: m === "always_free" }));

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store-settings");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const fetched = data.shippingRules as ShippingConfig | undefined;
      setConfig({
        freeShippingAll: fetched?.freeShippingAll ?? false,
        freeShippingThreshold: fetched?.freeShippingThreshold ?? DEFAULT_SHIPPING_CONFIG.freeShippingThreshold,
        contraentregaSurcharge: fetched?.contraentregaSurcharge ?? DEFAULT_SHIPPING_CONFIG.contraentregaSurcharge,
        regions: fetched?.regions?.length ? fetched.regions : DEFAULT_SHIPPING_CONFIG.regions,
        seasonalCampaign: {
          ...DEFAULT_SEASONAL_CAMPAIGN,
          ...(fetched?.seasonalCampaign ?? {}),
        },
      });
    } catch (err) {
      console.error("Error loading shipping settings", err);
      setConfig(DEFAULT_SHIPPING_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shipping_rules: config }),
      });
      if (!res.ok) throw new Error("save failed");
      setToast({ ok: true, msg: "Configuración guardada correctamente" });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ ok: false, msg: "Error al guardar. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  const updateRegionRate = (index: number, value: number) => {
    setConfig((c) => {
      const regions = c.regions.map((r, i) =>
        i === index ? { ...r, baseRate: value } : r
      );
      return { ...c, regions };
    });
  };

  const seasonalCampaign = config.seasonalCampaign ?? DEFAULT_SEASONAL_CAMPAIGN;

  const updateSeasonal = <K extends keyof typeof seasonalCampaign>(
    key: K,
    value: (typeof seasonalCampaign)[K],
  ) => {
    setConfig((c) => ({
      ...c,
      seasonalCampaign: {
        ...(c.seasonalCampaign ?? DEFAULT_SEASONAL_CAMPAIGN),
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0A2A66] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const detailOpacity = mode === "always_free"
    ? "opacity-40 pointer-events-none select-none"
    : "opacity-100";

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Configuración de envío
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Configura cómo se cobran los envíos en toda la tienda.
          </p>
        </div>
        <button
          onClick={loadSettings}
          title="Recargar configuración"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Siempre gratis */}
        <button
          type="button"
          onClick={() => setMode("always_free")}
          className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
            mode === "always_free"
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-600"
              : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === "always_free" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-gray-100 dark:bg-slate-800"}`}>
            <Sparkles size={18} className={mode === "always_free" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"} />
          </div>
          <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Envío gratis siempre</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Todos los pedidos tienen envío gratis, sin importar el monto.
          </p>
          {mode === "always_free" && (
            <CheckCircle2 size={16} className="absolute top-3 right-3 text-emerald-500" />
          )}
        </button>

        {/* Por monto mínimo */}
        <button
          type="button"
          onClick={() => setMode("threshold")}
          className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
            mode === "threshold"
              ? "border-[#0A2A66] bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500"
              : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mode === "threshold" ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-slate-800"}`}>
            <Truck size={18} className={mode === "threshold" ? "text-[#0A2A66] dark:text-blue-400" : "text-gray-400"} />
          </div>
          <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Envío gratis por monto mínimo</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            El cliente recibe envío gratis si su pedido supera un monto definido.
          </p>
          {mode === "threshold" && (
            <CheckCircle2 size={16} className="absolute top-3 right-3 text-[#0A2A66] dark:text-blue-400" />
          )}
        </button>
      </div>

      {/* Detail fields */}
      <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-5`}>
        {/* Threshold */}
        <div className={`transition-opacity ${detailOpacity}`}>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Monto mínimo para envío gratis (COP)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              step={5000}
              title="Monto mínimo para envío gratis"
              value={config.freeShippingThreshold}
              onChange={(e) =>
                setConfig((c) => ({ ...c, freeShippingThreshold: Number(e.target.value) || 0 }))
              }
              className="w-44 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
            <span className="text-xs text-gray-400 dark:text-slate-500">
              = {formatCOP(config.freeShippingThreshold)}
            </span>
          </div>
        </div>

        {/* Contraentrega surcharge */}
        <div className={`transition-opacity ${detailOpacity}`}>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Recargo contraentrega (COP)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              step={500}
              title="Recargo por pago contra entrega"
              value={config.contraentregaSurcharge}
              onChange={(e) =>
                setConfig((c) => ({ ...c, contraentregaSurcharge: Number(e.target.value) || 0 }))
              }
              className="w-44 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
            <span className="text-xs text-gray-400 dark:text-slate-500">
              Se suma solo en pagos contra entrega
            </span>
          </div>
        </div>

        {/* Region rates accordion */}
        <div className={`transition-opacity ${detailOpacity}`}>
          <button
            type="button"
            onClick={() => setRegionsOpen((o) => !o)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-slate-300 group"
          >
            <span>Tarifas por región <span className="text-gray-400 dark:text-slate-500 font-normal">({config.regions.length} regiones)</span></span>
            {regionsOpen
              ? <ChevronUp size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-200" />
              : <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-200" />
            }
          </button>

          {regionsOpen && (
            <div className="mt-3 space-y-2">
              {config.regions.map((region: ShippingRegion, i: number) => (
                <div key={region.label} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">{region.label}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{region.departments.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      title={`Tarifa base para ${region.label}`}
                      value={region.baseRate}
                      onChange={(e) => updateRegionRate(i, Number(e.target.value) || 0)}
                      className="w-28 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-right bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
                    />
                    <span className="text-xs text-gray-400 dark:text-slate-500 w-8">COP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 p-4">
        <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Vista previa — lo que verá el cliente
        </p>
        {mode === "always_free" ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 rounded-lg w-fit">
            <Sparkles size={15} />
            ¡Envío GRATIS en todos los pedidos!
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#0A2A66] dark:text-blue-400 font-medium">
              <Truck size={15} />
              Envío gratis en pedidos desde{" "}
              <span className="font-bold">{formatCOP(config.freeShippingThreshold)}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Recargo contra entrega: {formatCOP(config.contraentregaSurcharge)} ·{" "}
              Tarifas entre {formatCOP(Math.min(...config.regions.map((r) => r.baseRate)))} y{" "}
              {formatCOP(Math.max(...config.regions.map((r) => r.baseRate)))} según departamento
            </p>
          </div>
        )}
      </div>

      {/* Seasonal Home Theme */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Globe size={16} className="text-[#0A2A66] dark:text-blue-400" />
              Temporada visual del Home
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Activa una campaña global y actualiza textos sin tocar código.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={seasonalCampaign.enabled}
              onChange={(e) => updateSeasonal("enabled", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#0A2A66] focus:ring-[#0A2A66]"
            />
            Activa
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
              Temporada
            </label>
            <select
              title="Temporada visual"
              value={seasonalCampaign.key}
              onChange={(e) => updateSeasonal("key", e.target.value as SeasonalThemeKey)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            >
              {SEASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
              CTA enlace
            </label>
            <input
              type="text"
              value={seasonalCampaign.ctaHref}
              onChange={(e) => updateSeasonal("ctaHref", e.target.value)}
              placeholder="/combos"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={seasonalCampaign.title}
              onChange={(e) => updateSeasonal("title", e.target.value)}
              placeholder="Vibra mundialista: repuestos listos para rodar"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
              Subtítulo
            </label>
            <textarea
              value={seasonalCampaign.subtitle}
              onChange={(e) => updateSeasonal("subtitle", e.target.value)}
              placeholder="Campaña activa en toda la tienda para esta temporada."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
              Texto botón
            </label>
            <input
              type="text"
              value={seasonalCampaign.ctaLabel}
              onChange={(e) => updateSeasonal("ctaLabel", e.target.value)}
              placeholder="Ver campaña"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0A2A66]"
            />
          </div>

          <div className="flex items-end">
            <div className="w-full rounded-lg border border-dashed border-gray-300 dark:border-slate-600 px-3 py-2 text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2">
              <Palette size={14} />
              La paleta y animación del home cambian según la temporada seleccionada.
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0A2A66] hover:bg-[#0c3380] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition active:scale-95"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar configuración"
          )}
        </button>

        {toast && (
          <div className={`flex items-center gap-2 text-sm font-medium ${toast.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}

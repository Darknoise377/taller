"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

type AuditLogItem = {
  id: number;
  action: "ACCESS_DENIED" | "SENSITIVE_ACTION" | string;
  path: string;
  method: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AuditResponse = {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
};

export default function SecurityAuditPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs(currentPage: number, currentAction: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      });
      if (currentAction) params.set("action", currentAction);

      const res = await fetch(`/api/admin/security-audit?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("No tienes permisos para ver la auditoría de seguridad.");
        }
        throw new Error("No se pudo cargar la auditoría.");
      }

      const data = (await res.json()) as AuditResponse;
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(page, action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((log) => {
      return (
        log.path.toLowerCase().includes(term) ||
        log.method.toLowerCase().includes(term) ||
        (log.actorEmail ?? "").toLowerCase().includes(term) ||
        (log.actorRole ?? "").toLowerCase().includes(term) ||
        (log.reason ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-[#0A2A66]" size={24} />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
            Auditoría de Seguridad
          </h1>
        </div>
        <button
          onClick={() => loadLogs(page, action)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <RefreshCw size={16} />
          Recargar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ruta, actor, rol o razón"
          className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        />
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">Todas las acciones</option>
          <option value="ACCESS_DENIED">ACCESS_DENIED</option>
          <option value="SENSITIVE_ACTION">SENSITIVE_ACTION</option>
        </select>
        <div className="rounded-lg border border-gray-200 dark:border-slate-800 px-3 py-2 text-sm text-gray-600 dark:text-slate-300">
          Total registros: <span className="font-semibold">{total.toLocaleString("es-CO")}</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          Cargando auditoría...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Acción</th>
                <th className="p-3 text-left">Método</th>
                <th className="p-3 text-left">Ruta</th>
                <th className="p-3 text-left">Actor</th>
                <th className="p-3 text-left">Rol</th>
                <th className="p-3 text-left">IP</th>
                <th className="p-3 text-left">Razón</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500 dark:text-slate-400">
                    No hay registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 dark:border-slate-800">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("es-CO")}
                    </td>
                    <td className="p-3">{log.action}</td>
                    <td className="p-3">{log.method}</td>
                    <td className="p-3 font-mono text-xs">{log.path}</td>
                    <td className="p-3">{log.actorEmail ?? "—"}</td>
                    <td className="p-3">{log.actorRole ?? "—"}</td>
                    <td className="p-3">{log.ip ?? "—"}</td>
                    <td className="p-3">{log.reason ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-sm text-gray-600 dark:text-slate-300">
          Página {page} de {totalPages}
        </span>
        <button
          disabled={page >= totalPages || loading}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

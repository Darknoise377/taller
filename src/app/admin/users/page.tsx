"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false); // ✅ control del modal
  const [modalData, setModalData] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "VENDEDOR" });
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // 🚀 Cargar usuarios
  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 🔄 Crear o actualizar usuario
  const handleSave = async () => {
    if (!form.email || (!modalData && !form.password)) {
      toast.warning("Email y contraseña son obligatorios");
      return;
    }

    const method = modalData ? "PUT" : "POST";
    const url = modalData ? `/api/users/${modalData.id}` : "/api/users";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success(modalData ? "Usuario actualizado" : "Usuario creado");
      setModalOpen(false);
      setModalData(null);
      setForm({ email: "", password: "", name: "", role: "VENDEDOR" });
      loadUsers();
    } else {
      toast.error("Error al guardar usuario");
    }
  };

  // ❌ Eliminar usuario
  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Usuario eliminado");
      setDeletingUser(null);
      loadUsers();
    } else {
      toast.error("Error al eliminar usuario");
    }
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen">
      {/* 🔹 Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Gestión de Usuarios</h1>
        <button
          onClick={() => {
            setModalData(null);
            setForm({ email: "", password: "", name: "", role: "VENDEDOR" });
            setModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0A2A66] text-white px-4 py-2 rounded-lg hover:bg-[#0A2A66]/90 transition-all"
        >
          <UserPlus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* 📋 Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-slate-600 border-t-[#0A2A66]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
          <button onClick={loadUsers} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">Reintentar</button>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
          <UserPlus className="mx-auto mb-3 text-gray-300 dark:text-slate-600" size={40} />
          <p className="text-gray-500 dark:text-slate-400 text-lg">No hay usuarios registrados</p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">Crea el primer usuario con el botón de arriba</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800">
          <table className="min-w-full text-sm text-gray-800 dark:text-slate-200">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <th className="p-3 hidden md:table-cell">ID</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Email</th>
                <th className="p-3">Rol</th>
                <th className="p-3 hidden lg:table-cell">Creado</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-3 hidden md:table-cell">{u.id}</td>
                  <td className="p-3">{u.name || "—"}</td>
                  <td className="p-3 max-w-[220px] sm:max-w-none truncate">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3 hidden lg:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                      <button
                        className="text-[#0A2A66] hover:underline flex items-center justify-center gap-1"
                        onClick={() => {
                          setModalData(u);
                          setForm({
                            email: u.email,
                            name: u.name || "",
                            password: "",
                            role: u.role,
                          });
                          setModalOpen(true);
                        }}
                      >
                        <Pencil size={16} /> Editar
                      </button>
                      <button
                        className="text-red-600 hover:underline flex items-center justify-center gap-1"
                        onClick={() => setDeletingUser(u)}
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔹 Modal Crear/Editar Usuario */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-slate-900 p-6 rounded-xl w-[92vw] max-w-md shadow-lg relative border border-gray-200 dark:border-slate-700"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              {/* Botón de cierre */}
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-3 right-3 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>

              <h2 className="text-lg font-bold mb-4 text-center text-gray-800 dark:text-slate-100">
                {modalData ? "Editar Usuario" : "Crear Usuario"}
              </h2>

              <input
                type="text"
                placeholder="Nombre"
                className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 w-full p-2 mb-3 rounded-lg"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 w-full p-2 mb-3 rounded-lg"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                type="password"
                placeholder={modalData ? "Nueva contraseña (opcional)" : "Contraseña"}
                className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 w-full p-2 mb-3 rounded-lg"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <select
                className="border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 w-full p-2 mb-4 rounded-lg"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="VENDEDOR">VENDEDOR</option>
              </select>

              <div className="flex justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="bg-[#0A2A66] text-white px-4 py-2 rounded-lg hover:bg-[#0A2A66]/90 transition-colors"
                >
                  {modalData ? "Guardar Cambios" : "Crear"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ❌ Modal Confirmar Eliminación */}
      <AnimatePresence>
        {deletingUser && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
                className="bg-white dark:bg-slate-900 p-6 rounded-xl w-[92vw] max-w-sm shadow-lg border border-gray-200 dark:border-slate-700"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="text-lg font-bold mb-4 text-center text-red-600">
                Confirmar eliminación
              </h2>
              <p className="text-center mb-4 text-gray-700 dark:text-slate-300">
                ¿Seguro que deseas eliminar a <b>{deletingUser.email}</b>?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="text-gray-600 dark:text-slate-400 hover:underline"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deletingUser.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

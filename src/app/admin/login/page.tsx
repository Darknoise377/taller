'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { AdminSessionUser } from '@/types/auth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    return 'Error en el inicio de sesión';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      message.warning('Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Credenciales incorrectas');

      const loggedUser = data?.user as AdminSessionUser | undefined;
      if (loggedUser) {
        setUser(loggedUser);
      }

      message.success('✅ Bienvenido, administrador');
      router.replace('/admin');
      router.refresh();
    } catch (err: unknown) {
      console.error('Error de login:', err);
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Lado visual */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-[#0A2A66] via-[#153B82] to-[#2E5FA7] text-white relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center px-8"
        >
          <h1 className="text-4xl font-extrabold mb-4">Panel Administrativo</h1>
          <p className="text-lg opacity-90">
            Gestiona productos, órdenes y usuarios con facilidad.
          </p>
        </motion.div>

        <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl top-10 left-10 animate-pulse" />
        <div className="absolute w-96 h-96 bg-[#C7D2E0]/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse" />
      </div>

      {/* Lado formulario */}
      <div className="flex items-center justify-center p-6 bg-gray-50">
        <motion.form
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-200"
        >
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            🔐 Ingreso Admin
          </h2>

          {/* Email */}
          <label className="block mb-5">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                className="w-full border rounded-lg pl-10 pr-3 py-3 text-gray-800 focus:ring-2 focus:ring-[#0A2A66] focus:outline-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tudominio.com"
                autoFocus
                required
              />
            </div>
          </label>

          {/* Contraseña */}
          <label className="block mb-6">
            <span className="text-sm font-medium text-gray-700">Contraseña</span>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                className="w-full border rounded-lg pl-10 pr-3 py-3 text-gray-800 focus:ring-2 focus:ring-[#0A2A66] focus:outline-none"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </label>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:from-[#081F4D] hover:to-[#1E4F95] text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 shadow-lg"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

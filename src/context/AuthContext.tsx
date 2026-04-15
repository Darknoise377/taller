"use client";

import "@ant-design/v5-patch-for-react-19";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { message } from "antd";
import { useRouter } from "next/navigation";
import type { AdminSessionUser } from "@/types/auth";

/**
 * Define la estructura del contexto de autenticación.
 */
interface AuthContextType {
  user: AdminSessionUser | null;
  setUser: (user: AdminSessionUser | null) => void;
  logout: () => Promise<void>;
}

// ✅ CAMBIO CLAVE: Usamos 'null' en lugar de 'undefined' como valor inicial
// Esto ayuda a evitar conflictos de tipos en el App Router de Next.js
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Proveedor de autenticación que maneja el estado del usuario y la lógica de cierre de sesión.
 */
export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: AdminSessionUser | null;
}) {
  const [user, setUser] = useState<AdminSessionUser | null>(initialUser);
  const router = useRouter();

  // Restaura sesión en refresh (sin hacer el RootLayout dinámico).
  useEffect(() => {
    if (user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) return;
        const data = (await res.json()) as { user: AdminSessionUser | null };
        if (!cancelled && data?.user) setUser(data.user);
      } catch {
        // Silencioso: si falla, dejamos user en null.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Cierra la sesión del usuario, llama a la API de logout y redirige.
   */
  const logout = async () => {
    try {
      // Realiza la llamada a tu API Route para borrar la cookie de sesión
      const res = await fetch("/api/admin/logout", { method: "POST" });
      
      if (!res.ok) {
        // Lanza un error si el servidor responde con un status no exitoso
        throw new Error(`Error al cerrar sesión: ${res.statusText}`);
      }

      message.success("Sesión cerrada correctamente");
      setUser(null); // Limpiamos el estado local del usuario
      router.push("/admin/login"); // Redirigimos al login
    } catch (error) {
      console.error("[LOGOUT ERROR]", error);
      message.error("No se pudo cerrar sesión. Inténtalo de nuevo.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder fácilmente al estado de autenticación.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  // ✅ Manejamos el caso 'null' (que ahora es el valor inicial del contexto)
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  
  return context;
}

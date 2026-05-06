"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CustomerUser } from "@/types/auth";

interface CustomerAuthContextType {
  user: CustomerUser | null;
  setUser: (user: CustomerUser | null) => void;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

export function CustomerAuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: CustomerUser | null;
}) {
  const [user, setUser] = useState<CustomerUser | null>(initialUser);
  const router = useRouter();

  // Restore session on refresh
  useEffect(() => {
    if (user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { user: CustomerUser | null };
        if (!cancelled && data?.user) setUser(data.user);
      } catch {
        // silently ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/cuenta/login");
    } catch (error) {
      console.error("[CustomerAuthContext] logout error:", error);
    }
  };

  return (
    <CustomerAuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth debe usarse dentro de CustomerAuthProvider");
  return ctx;
}

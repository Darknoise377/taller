"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CustomerAuthProvider, useCustomerAuth } from "@/context/CustomerAuthContext";
import { LogOut, Package, User } from "lucide-react";

function CuentaShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useCustomerAuth();
  const pathname = usePathname();

  const NAV = [
    { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
    { href: "/cuenta/perfil", label: "Perfil", icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#070617]">
      {/* Header */}
      <header className="bg-white dark:bg-[#0b0a1f] border-b border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-[#0A2A66] dark:text-slate-100 tracking-tight">
            Taller A&amp;R
          </Link>

          <nav className="flex items-center gap-2">
            {user &&
              NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(href)
                      ? "bg-[#0A2A66] text-white"
                      : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              ))}

            {user ? (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            ) : (
              <Link
                href="/cuenta/login"
                className="px-3 py-2 rounded-lg text-sm font-medium bg-[#0A2A66] text-white hover:bg-[#0A2A66]/90 transition-colors"
              >
                Iniciar sesión
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* User greeting */}
      {user && (
        <div className="bg-[#0A2A66]/5 dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-800 px-4 py-2">
          <p className="max-w-5xl mx-auto text-sm text-gray-600 dark:text-slate-400">
            Hola, <strong className="text-gray-800 dark:text-slate-200">{user.name ?? user.email}</strong>
          </p>
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthProvider initialUser={null}>
      <CuentaShell>{children}</CuentaShell>
    </CustomerAuthProvider>
  );
}

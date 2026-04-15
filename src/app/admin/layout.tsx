"use client";

import React from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { BadgePercent, LayoutDashboard, LogOut, Package, PackageSearch, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/orders", label: "Órdenes", icon: PackageSearch },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/codes", label: "Códigos", icon: BadgePercent },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#070617]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-[#0b0a1f] shadow-sm border-b border-gray-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">
          Panel de Administración
        </h1>

        {user && (
          <nav className="flex flex-wrap gap-2 w-full sm:w-auto">
            {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 ${
                    active
                      ? "bg-[#0A2A66] text-white ring-2 ring-[#0A2A66]/30"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
            <button
              onClick={logout}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 text-sm font-medium"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="w-full max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider initialUser={null}>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}

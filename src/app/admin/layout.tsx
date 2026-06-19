"use client";

import React from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { BadgePercent, Gift, LayoutDashboard, LogOut, MessageCircleMore, Package, PackageSearch, ShieldAlert, ShoppingCart, Truck, Users, BarChart2, Zap } from "lucide-react";
import type { AdminRole } from "@/types/auth";

const ROLE_RANK: Record<AdminRole, number> = { SUPERADMIN: 3, ADMIN: 2, VENDEDOR: 1 };

const ROLE_LABEL: Record<AdminRole, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
};

const ROLE_COLOR: Record<AdminRole, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  VENDEDOR: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  minRole: AdminRole;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, minRole: "VENDEDOR" },
  { href: "/admin/products", label: "Productos", icon: Package, minRole: "VENDEDOR" },
  { href: "/admin/orders", label: "Órdenes", icon: PackageSearch, minRole: "VENDEDOR" },
  { href: "/admin/combos", label: "Combos", icon: Gift, minRole: "ADMIN" },
  { href: "/admin/chat-analytics", label: "Chat IA", icon: MessageCircleMore, minRole: "ADMIN" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2, minRole: "ADMIN" },
  { href: "/admin/codes", label: "Códigos y Promociones", icon: BadgePercent, minRole: "VENDEDOR" },
  { href: "/admin/flash-sales", label: "Ofertas Relámpago", icon: Zap, minRole: "ADMIN" },
  { href: "/admin/shipping", label: "Envío", icon: Truck, minRole: "ADMIN" },
  { href: "/admin/users", label: "Usuarios", icon: Users, minRole: "SUPERADMIN" },
  { href: "/admin/security-audit", label: "Auditoría", icon: ShieldAlert, minRole: "SUPERADMIN" },
  { href: "/admin/meli", label: "Mercado Libre", icon: ShoppingCart, minRole: "ADMIN" },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = user?.role as AdminRole | undefined;
  const userRank = userRole ? ROLE_RANK[userRole] : 0;

  const visibleNav = NAV_ITEMS.filter(
    (item) => userRank >= ROLE_RANK[item.minRole],
  );

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#070617]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-[#0b0a1f] shadow-sm border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">
            Panel de Administración
          </h1>
          {userRole && (
            <span className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLOR[userRole]}`}>
              {ROLE_LABEL[userRole]}
            </span>
          )}
        </div>

        {user && (
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:items-end">
            <span className="text-xs text-gray-400 dark:text-slate-500 text-right truncate max-w-[260px]">
              {user.email}
            </span>
          <nav className="flex flex-wrap gap-2 w-full sm:w-auto">
            {visibleNav.map(({ href, label, icon: Icon, exact }) => {
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
          </div>
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

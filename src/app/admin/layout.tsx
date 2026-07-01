"use client";

import React, { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  BadgePercent, Gift, LayoutDashboard, LogOut, MessageCircleMore,
  Package, PackageSearch, ShieldAlert, ShoppingCart, Truck, Users,
  BarChart2, Zap, Share2, Menu, X, ChevronRight, Settings,
} from "lucide-react";
import type { AdminRole } from "@/types/auth";

const ROLE_RANK: Record<AdminRole, number> = { SUPERADMIN: 3, ADMIN: 2, VENDEDOR: 1 };

const ROLE_LABEL: Record<AdminRole, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
};

const ROLE_BADGE: Record<AdminRole, string> = {
  SUPERADMIN: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  ADMIN: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  VENDEDOR: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

type NavGroup = { label: string; items: NavItem[] };
type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  minRole: AdminRole;
  badge?: string;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, minRole: "VENDEDOR" },
      { href: "/admin/products", label: "Productos", icon: Package, minRole: "VENDEDOR" },
      { href: "/admin/orders", label: "Órdenes", icon: PackageSearch, minRole: "VENDEDOR" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/admin/combos", label: "Combos", icon: Gift, minRole: "ADMIN" },
      { href: "/admin/codes", label: "Promociones", icon: BadgePercent, minRole: "VENDEDOR" },
      { href: "/admin/flash-sales", label: "Ofertas Flash", icon: Zap, minRole: "ADMIN" },
      { href: "/admin/shipping", label: "Envíos", icon: Truck, minRole: "ADMIN" },
    ],
  },
  {
    label: "Inteligencia",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart2, minRole: "ADMIN" },
      { href: "/admin/chat-analytics", label: "Chat IA", icon: MessageCircleMore, minRole: "ADMIN" },
      { href: "/admin/meli", label: "Mercado Libre", icon: ShoppingCart, minRole: "ADMIN" },
      { href: "/admin/meta", label: "Redes Sociales", icon: Share2, minRole: "ADMIN" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/users", label: "Usuarios", icon: Users, minRole: "SUPERADMIN" },
      { href: "/admin/security-audit", label: "Auditoría", icon: ShieldAlert, minRole: "SUPERADMIN" },
    ],
  },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = user?.role as AdminRole | undefined;
  const userRank = userRole ? ROLE_RANK[userRole] : 0;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const currentPage = NAV_GROUPS.flatMap(g => g.items).find(
    item => isActive(item.href, item.exact)
  );

  const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? "AD";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Settings size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-wide">TALLER A&R</p>
            <p className="text-white/50 text-[10px] uppercase tracking-widest">Panel de Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 no-scrollbar">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(item => userRank >= ROLE_RANK[item.minRole]);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon, exact, badge }) => {
                  const active = isActive(href, exact);
                  return (
                    <button
                      key={href}
                      onClick={() => { router.push(href); setSidebarOpen(false); }}
                      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-white/15 text-white shadow-sm backdrop-blur-sm"
                          : "text-white/60 hover:text-white hover:bg-white/8"
                      }`}
                    >
                      <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                        active ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
                      }`}>
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 text-left">{label}</span>
                      {badge && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                          {badge}
                        </span>
                      )}
                      {active && <ChevronRight size={14} className="opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      {user && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-xs font-bold border border-white/20 flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.email}</p>
              {userRole && (
                <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${ROLE_BADGE[userRole]}`}>
                  {ROLE_LABEL[userRole]}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors text-xs font-medium border border-red-500/20"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F0F4FA] dark:bg-[#070E1F]">
      {/* ── Sidebar Desktop ── */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 fixed inset-y-0 left-0 z-30 bg-[linear-gradient(160deg,#0A2A66_0%,#1a3d7a_60%,#2E5FA7_100%)]">
        <SidebarContent />
      </aside>

      {/* ── Sidebar Mobile Overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 flex flex-col shadow-2xl bg-[linear-gradient(160deg,#0A2A66_0%,#1a3d7a_60%,#2E5FA7_100%)]">
            <button
              onClick={() => setSidebarOpen(false)}
              title="Cerrar menú"
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        {/* ── Top Header ── */}
        <header className="sticky top-0 z-20 flex items-center gap-4 px-4 sm:px-6 py-3.5 bg-white/80 dark:bg-[#0a1628]/80 backdrop-blur-md border-b border-gray-200/70 dark:border-slate-800/70 shadow-sm">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            title="Abrir menú"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 dark:text-slate-500 hidden sm:block">Admin</span>
            {currentPage && (
              <>
                <ChevronRight size={14} className="text-gray-300 dark:text-slate-600 hidden sm:block" />
                <span className="font-semibold text-gray-800 dark:text-slate-100">{currentPage.label}</span>
              </>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] flex items-center justify-center text-white text-xs font-bold">
                {userInitials}
              </div>
              <div className="hidden md:block text-right">
                <p className="text-xs font-medium text-gray-800 dark:text-slate-100 truncate max-w-[160px]">{user?.email}</p>
                {userRole && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">{ROLE_LABEL[userRole]}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="w-full max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider initialUser={null}>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}

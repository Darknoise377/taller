"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  BadgePercent,
  Gift,
  LayoutDashboard,
  LogOut,
  MessageCircleMore,
  Package,
  PackageSearch,
  ShieldAlert,
  ShoppingCart,
  Truck,
  Users,
  BarChart2,
  Zap,
  Share2,
  Menu,
  X,
  ChevronRight,
  Store,
  ExternalLink,
  Wrench,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Sparkles,
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
  ADMIN: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  VENDEDOR: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  minRole: AdminRole;
  badgeKey?: "orders" | "products";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, minRole: "VENDEDOR" },
      { href: "/admin/products", label: "Productos", icon: Package, minRole: "VENDEDOR", badgeKey: "products" },
      { href: "/admin/orders", label: "Órdenes", icon: PackageSearch, minRole: "VENDEDOR", badgeKey: "orders" },
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
    label: "Inteligencia & Canales",
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
  const [collapsed, setCollapsed] = useState(false);

  // Conteo en vivo de alertas para los badges de navegación
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number | null>(null);
  const [criticalStockCount, setCriticalStockCount] = useState<number | null>(null);

  // Cargar preferencia de colapso de localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("admin_sidebar_collapsed", String(next));
    } catch {}
  };

  // Cargar métricas ligeras para insignias del sidebar
  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        if (typeof data.pendingOrders === "number") {
          setPendingOrdersCount(data.pendingOrders);
        }
        if (typeof data.outOfStockProducts === "number" || typeof data.lowStockProducts === "number") {
          const totalAlerts = (data.outOfStockProducts ?? 0) + (data.lowStockProducts ?? 0);
          setCriticalStockCount(totalAlerts);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const userRole = user?.role as AdminRole | undefined;
  const userRank = userRole ? ROLE_RANK[userRole] : 0;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const currentPage = NAV_GROUPS.flatMap((g) => g.items).find((item) =>
    isActive(item.href, item.exact)
  );

  const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? "AR";

  const getBadgeValue = (key?: "orders" | "products") => {
    if (key === "orders" && pendingOrdersCount && pendingOrdersCount > 0) {
      return { text: String(pendingOrdersCount), bg: "bg-amber-500 text-slate-950 font-bold" };
    }
    if (key === "products" && criticalStockCount && criticalStockCount > 0) {
      return { text: `!`, bg: "bg-rose-500 text-white font-bold" };
    }
    return null;
  };

  // Contenido reutilizable del sidebar
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCompact = !isMobile && collapsed;

    return (
      <div className="flex flex-col h-full select-none">
        {/* ── Brand Header ─────────────────────────────────────────────── */}
        <div
          className={`py-5 border-b border-white/10 flex items-center transition-all ${
            isCompact ? "px-3 justify-center" : "px-5 justify-between"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo Monograma / Icono */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-[#0A2A66] p-0.5 shadow-md flex-shrink-0">
              <div className="w-full h-full rounded-[10px] bg-[#071838] flex items-center justify-center border border-white/20">
                <Wrench size={18} className="text-sky-400" />
              </div>
            </div>

            {!isCompact && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-extrabold text-sm tracking-wide leading-tight truncate">
                    TALLER A&R
                  </p>
                  <span className="text-[9px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.2 rounded border border-sky-400/30">
                    PRO
                  </span>
                </div>
                <p className="text-white/50 text-[10px] tracking-wider truncate uppercase mt-0.5">
                  Motoservicio Admin
                </p>
              </div>
            )}
          </div>

          {/* Botón de Colapso (Solo Desktop) */}
          {!isMobile && (
            <button
              onClick={toggleCollapsed}
              className={`text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 ${
                isCompact ? "hidden" : "block"
              }`}
              title={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* ── Navegación Principal ─────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 no-scrollbar">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => userRank >= ROLE_RANK[item.minRole]
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label}>
                {/* Título de Grupo */}
                {isCompact ? (
                  <div className="h-px bg-white/10 my-2.5 mx-2" />
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 px-3 mb-1.5">
                    {group.label}
                  </p>
                )}

                <div className="space-y-1">
                  {visibleItems.map(({ href, label, icon: Icon, exact, badgeKey }) => {
                    const active = isActive(href, exact);
                    const badge = getBadgeValue(badgeKey);

                    return (
                      <button
                        key={href}
                        onClick={() => {
                          router.push(href);
                          if (isMobile) setSidebarOpen(false);
                        }}
                        title={isCompact ? label : undefined}
                        className={`group relative w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                          isCompact ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
                        } ${
                          active
                            ? "bg-gradient-to-r from-white/18 to-white/10 text-white font-semibold shadow-sm border border-white/20 backdrop-blur-sm"
                            : "text-white/65 hover:text-white hover:bg-white/8"
                        }`}
                      >
                        {/* Indicador de barra activa izquierda */}
                        {active && !isCompact && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-sky-400" />
                        )}

                        {/* Icono con contenedor estilizado */}
                        <span
                          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                            active
                              ? "bg-white/20 text-white shadow-inner"
                              : "bg-white/5 text-white/80 group-hover:bg-white/10 group-hover:text-white"
                          }`}
                        >
                          <Icon size={17} />
                        </span>

                        {/* Etiqueta */}
                        {!isCompact && (
                          <span className="flex-1 text-left truncate tracking-tight">
                            {label}
                          </span>
                        )}

                        {/* Insignia / Badge */}
                        {badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full shadow-sm leading-none flex items-center justify-center ${badge.bg} ${
                              isCompact ? "absolute top-1.5 right-1.5 w-4 h-4 p-0" : ""
                            }`}
                          >
                            {badge.text}
                          </span>
                        )}

                        {active && !isCompact && (
                          <ChevronRight size={14} className="text-white/40 group-hover:text-white/80 transition-colors" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Botón de Expandir (cuando está colapsado) ────────────────── */}
        {isCompact && (
          <div className="p-2 border-t border-white/10 flex justify-center">
            <button
              onClick={toggleCollapsed}
              className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Expandir menú lateral"
            >
              <PanelLeftOpen size={18} />
            </button>
          </div>
        )}

        {/* ── User Footer ──────────────────────────────────────────────── */}
        {user && (
          <div
            className={`border-t border-white/10 bg-black/15 transition-all ${
              isCompact ? "p-3 flex flex-col items-center gap-2" : "p-4"
            }`}
          >
            {isCompact ? (
              <>
                <div
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-xs font-bold border border-white/20"
                  title={user.email}
                >
                  {userInitials}
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/25 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-xs font-bold border border-white/20 flex-shrink-0 shadow-sm">
                    {userInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate leading-tight">
                      {user.email}
                    </p>
                    {userRole && (
                      <span
                        className={`inline-flex text-[9px] font-semibold px-2 py-0.5 rounded-full mt-1 ${ROLE_BADGE[userRole]}`}
                      >
                        {ROLE_LABEL[userRole]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={logout}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors text-xs font-semibold border border-rose-500/25"
                  >
                    <LogOut size={13} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] dark:bg-[#060c18] text-slate-900 dark:text-slate-100 antialiased">
      {/* ── 1. Sidebar Desktop (Collapsible) ───────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out border-r border-slate-800/60 shadow-xl bg-[linear-gradient(175deg,#061633_0%,#092350_50%,#0e326e_100%)] ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── 2. Sidebar Mobile Overlay (Drawer suave) ───────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] flex flex-col shadow-2xl z-10 bg-[linear-gradient(175deg,#061633_0%,#092350_50%,#0e326e_100%)]">
            <button
              onClick={() => setSidebarOpen(false)}
              title="Cerrar menú"
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* ── 3. Main Content Wrapper ────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* ── Top Navigation Bar ───────────────────────────────────────── */}
        <header className="sticky top-0 z-20 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-white/85 dark:bg-[#071328]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            title="Abrir menú"
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Menu size={18} />
          </button>

          {/* Desktop quick collapse toggle button in navbar */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Breadcrumb Elegante */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <span className="text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
              Administración
            </span>
            {currentPage && (
              <>
                <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 hidden sm:inline" />
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <currentPage.icon size={15} className="text-[#0A2A66] dark:text-sky-400" />
                  {currentPage.label}
                </span>
              </>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Acceso directo a la Tienda Pública */}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            title="Ver tienda pública en nueva pestaña"
          >
            <Store size={14} className="text-[#0A2A66] dark:text-sky-400" />
            <span className="hidden sm:inline">Ver Tienda</span>
            <ExternalLink size={11} className="text-slate-400" />
          </Link>

          {/* User profile avatar in header */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] flex items-center justify-center text-white text-xs font-bold shadow-xs">
              {userInitials}
            </div>
            {userRole && (
              <span className="hidden md:inline-block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {ROLE_LABEL[userRole]}
              </span>
            )}
          </div>
        </header>

        {/* ── Page Content Container ───────────────────────────────────── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
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

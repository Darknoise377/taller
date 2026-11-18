'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { isCheckoutPath } from '@/utils/routeUtils';
import { toast } from 'sonner';
import {
  ShoppingCartIcon,
  SunIcon,
  MoonIcon,
  HomeIcon,
  CubeIcon,
  UserIcon,
  PhoneIcon,
  TruckIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Package } from 'lucide-react';
import MegaMenu from '@/components/home/MegaMenu';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from '@/constants/productCategories';

const Navbar = () => {
  const { totalItems, openCartModal } = useCart();
  const { user } = useCustomerAuth();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [badgeBounce, setBadgeBounce] = useState(false);
  const [isNavidad, setIsNavidad] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prevTotalRef = useRef(totalItems);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('ar-season-theme');
      if (stored === 'none') {
        setIsNavidad(false);
      } else {
        setIsNavidad(true);
      }
    } catch {
      // ignore
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail && detail.key !== undefined) {
        setIsNavidad(detail.key === 'navidad');
      }
    };
    window.addEventListener('ar-season-theme-change', handler);
    return () => window.removeEventListener('ar-season-theme-change', handler);
  }, []);

  const toggleNavidad = () => {
    const next = !isNavidad;
    setIsNavidad(next);
    const key = next ? 'navidad' : 'none';
    try {
      localStorage.setItem('ar-season-theme', key);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-season-theme', key);
    window.dispatchEvent(new CustomEvent('ar-season-theme-change', { detail: { key } }));
    if (next) {
      toast.success('🎄 Edición Especial de Navidad activada');
    } else {
      toast('Tema Estándar activado');
    }
  };

  // Animate badge when items count increases
  useEffect(() => {
    if (totalItems > prevTotalRef.current) {
      setBadgeBounce(true);
      const timer = setTimeout(() => setBadgeBounce(false), 300);
      return () => clearTimeout(timer);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems]);

  // En checkout ocultamos navbar (flujo de pago más limpio)
  if (isCheckoutPath(pathname)) return null;

  const isDark = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const links = [
    { href: '/', label: 'Inicio', icon: HomeIcon },
    { href: '/products', label: 'Productos', icon: CubeIcon },
  ];

  return (
    <>
      {/* --- NAVBAR SUPERIOR --- */}
      <header className="w-full flex items-center justify-between px-3 sm:px-6 md:px-12 py-2.5 sm:py-3 sticky top-0 z-50 bg-white/85 dark:bg-[#07122e]/90 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
        {/* Logo y Nombre */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`relative h-11 w-11 overflow-hidden rounded-full ring-2 shadow-md transition-all duration-300 ${
              isNavidad
                ? "ring-[#D6B46A] shadow-[0_0_12px_rgba(214,180,106,0.35)]"
                : "ring-slate-200 dark:ring-slate-700"
            }`}>
              <Image
                src="/logo.png"
                alt="Logo Taller de Motos A&R"
                fill
                sizes="44px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Motoservicio A&amp;R
                </h1>
                {isNavidad && (
                  <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#173D32] text-[#D6B46A] border border-[#D6B46A]/45 shadow-sm">
                    Navidad Sobre Ruedas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Repuestos y servicio técnico
              </p>
            </div>
          </Link>
        </div>

        {/* Navegación (Desktop) */}
        <nav className="flex items-center gap-3 md:gap-5">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`hidden md:flex items-center gap-2 text-sm font-medium transition-colors pb-0.5 border-b-2 ${
                pathname === href
                  ? isNavidad
                    ? 'text-[#0e3d2f] dark:text-[#f3cf65] border-[#cf9e33] font-bold'
                    : 'text-[#0A2A66] dark:text-white border-[#0A2A66] dark:border-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-slate-600'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf9e33] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}

          {/* Mega Menu de Categorías */}
          <MegaMenu />

          {/* Cuenta / Mis pedidos (desktop) */}
          {user ? (
            <Link
              href="/cuenta/pedidos"
              className={`hidden md:flex items-center gap-2 text-sm font-medium transition-colors pb-0.5 border-b-2 ${
                pathname.startsWith('/cuenta')
                  ? isNavidad
                    ? 'text-[#0e3d2f] dark:text-[#f3cf65] border-[#cf9e33] font-bold'
                    : 'text-[#0A2A66] dark:text-white border-[#0A2A66] dark:border-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-slate-600'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf9e33] focus-visible:ring-offset-2 rounded`}
            >
              <Package className="w-5 h-5" />
              Mis pedidos
            </Link>
          ) : (
            <>
              <Link
                href="/seguimiento"
                className={`hidden md:flex items-center gap-2 text-sm font-medium transition-colors pb-0.5 border-b-2 ${
                  pathname === '/seguimiento'
                    ? isNavidad
                      ? 'text-[#0e3d2f] dark:text-[#f3cf65] border-[#cf9e33] font-bold'
                      : 'text-[#0A2A66] dark:text-white border-[#0A2A66] dark:border-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf9e33] focus-visible:ring-offset-2 rounded`}
              >
                <TruckIcon className="w-5 h-5" />
                Rastrear pedido
              </Link>
              <Link
                href="/cuenta/login"
                className="hidden md:flex items-center gap-2 text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf9e33] focus-visible:ring-offset-2 rounded"
              >
                <UserIcon className="w-5 h-5" />
                Cuenta
              </Link>
            </>
          )}

          {/* WhatsApp rápido (desktop) */}
          <a
            href="https://wa.me/573015271104?text=Hola%2C%20quiero%20informaci%C3%B3n"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contactar por WhatsApp"
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5d] transition-colors px-3 py-1.5 rounded-full shadow-sm"
          >
            <PhoneIcon className="w-4 h-4" />
            WhatsApp
          </a>

          {/* Carrito (Desktop - en móvil está en la barra inferior) */}
          <button
            type="button"
            onClick={openCartModal}
            className="hidden md:flex relative items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Abrir carrito"
          >
            <ShoppingCartIcon className="w-6 h-6" />
            {totalItems > 0 && (
              <span className={`absolute -top-1 -right-1 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md transition-transform duration-300 ${badgeBounce ? "scale-125" : "scale-100"} ${
                isNavidad
                  ? "bg-gradient-to-r from-[#891a2b] to-[#cf9e33] text-white ring-1 ring-white/30"
                  : "bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7]"
              }`}>
                {totalItems}
              </span>
            )}
          </button>

          {/* Botón Edición Navidad Sobre Ruedas */}
          <button
            type="button"
            onClick={toggleNavidad}
            aria-label={isNavidad ? "Desactivar edición navideña" : "Activar edición especial de Navidad"}
            title={isNavidad ? "Campaña Navidad activa (Clic para volver a tema clásico)" : "Activar Edición Especial de Navidad"}
            className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-full text-xs font-bold transition-all duration-300 shadow-sm hover:scale-105 focus-visible:outline-none focus-visible:ring-2 ${
              isNavidad
                ? "bg-[#173D32] text-[#F5F1E8] border border-[#D6B46A]/60 shadow-[0_2px_14px_rgba(214,180,106,0.25)] ring-1 ring-[#D6B46A]/40 focus-visible:ring-[#D6B46A]"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#2E5FA7] dark:hover:border-[#5B8DD9] focus-visible:ring-[#2E5FA7]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#D6B46A] animate-pulse" />
            <span>
              {isNavidad ? "Navidad" : "Tema Clásico"}
            </span>
          </button>

          {/* Botón de Tema (Claro / Oscuro) con tamaño accesible */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Cambiar tema claro u oscuro"
            className={`w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#07122e] ${
              isNavidad ? "focus-visible:ring-[#cf9e33]" : "focus-visible:ring-[#2E5FA7] dark:focus-visible:ring-[#5B8DD9]"
            }`}
          >
            {!mounted ? null : isDark ? (
              <SunIcon className={`w-5 h-5 ${isNavidad ? "text-[#f3cf65]" : "text-[#C7D2E0]"}`} />
            ) : (
              <MoonIcon className={`w-5 h-5 ${isNavidad ? "text-[#165640]" : "text-[#2E5FA7]"}`} />
            )}
          </button>
        </nav>
      </header>

      {/* --- NAV INFERIOR (Solo móvil) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-[#070617]/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex justify-around items-center pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50 transition-colors duration-300">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={`flex flex-col items-center text-xs ${
              pathname === href
                ? isNavidad
                  ? 'text-[#0e3d2f] dark:text-[#f3cf65] font-bold'
                  : 'text-[#0A2A66] dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf9e33] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded`}
          >
            <Icon className="w-6 h-6" />
            {label}
          </Link>
        ))}

        {/* Categorías (móvil drawer trigger) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center text-xs ${
            mobileMenuOpen
              ? isNavidad
                ? 'text-[#0e3d2f] dark:text-[#f3cf65] font-bold'
                : 'text-[#0A2A66] dark:text-white font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="Abrir categorías"
        >
          <Squares2X2Icon className="w-6 h-6" />
          Categorías
        </button>

        {/* Cuenta (móvil) */}
        <Link
          href={user ? '/cuenta' : '/cuenta/login'}
          className={`flex flex-col items-center text-xs ${
            pathname.startsWith('/cuenta')
              ? isNavidad
                ? 'text-[#0e3d2f] dark:text-[#f3cf65] font-bold'
                : 'text-[#0A2A66] dark:text-white font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserIcon className="w-6 h-6" />
          Cuenta
        </Link>

        {/* Carrito */}
        <button
          type="button"
          onClick={openCartModal}
          className="relative flex flex-col items-center text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ShoppingCartIcon className="w-6 h-6" />
          {totalItems > 0 && (
            <span className={`absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md ${
              isNavidad
                ? 'bg-gradient-to-r from-[#891a2b] to-[#cf9e33]'
                : 'bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7]'
            }`}>
              {totalItems}
            </span>
          )}
          Carrito
        </button>
      </nav>

      {/* ─── DRAWER MÓVIL DE CATEGORÍAS ─── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-[85%] max-w-xs bg-white dark:bg-[#07122e] h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Header del Drawer */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a1838]">
              <div className="flex items-center gap-2">
                <Squares2X2Icon className="w-5 h-5 text-[#0A2A66] dark:text-[#5B8DD9]" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">Categorías de Repuestos</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                aria-label="Cerrar menú"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Categorías */}
            <nav className="p-3 space-y-1 flex-1">
              {PRODUCT_CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  href={`/products/category/${cat}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#2E5FA7] dark:bg-[#5B8DD9]" />
                    {PRODUCT_CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-slate-400 text-xs">→</span>
                </Link>
              ))}
            </nav>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a1838]">
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 block text-center text-xs font-bold bg-[#0A2A66] dark:bg-[#2E5FA7] text-white rounded-xl shadow-sm hover:opacity-95 transition-opacity"
              >
                Ver todos los repuestos
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

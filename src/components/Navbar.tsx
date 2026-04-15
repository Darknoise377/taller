'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { isCheckoutPath } from '@/utils/routeUtils';
import {
  ShoppingCartIcon,
  SunIcon,
  MoonIcon,
  HomeIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { totalItems, openCartModal } = useCart();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [badgeBounce, setBadgeBounce] = useState(false);
  const prevTotalRef = useRef(totalItems);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <header className="w-full flex items-center justify-between px-6 md:px-12 py-3 sticky top-0 z-50 bg-white/80 dark:bg-[#070617]/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        {/* Logo y Nombre */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 overflow-hidden rounded-full ring-1 ring-slate-200 shadow-md dark:ring-slate-700">
              <Image
                src="/icon.svg"
                alt="Logo Taller de Motos A&R"
                fill
                sizes="44px"
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                TALLER DE MOTOS A&amp;R
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Almacén, taller y motoservicio.
              </p>
            </div>
          </Link>
        </div>

        {/* Navegación (Desktop) */}
        <nav className="flex items-center gap-4 md:gap-6">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`hidden md:flex items-center gap-2 text-sm font-medium transition-colors ${
                pathname === href
                  ? 'text-[#0A2A66]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}

          {/* Carrito */}
          <button
            type="button"
            onClick={openCartModal}
            className="relative flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Abrir carrito"
          >
            <ShoppingCartIcon className="w-7 h-7" />
            {totalItems > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md transition-transform duration-300 ${badgeBounce ? "scale-125" : "scale-100"}`}>
                {totalItems}
              </span>
            )}
          </button>

          {/* Botón de Tema */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617]"
          >
            {!mounted ? null : isDark ? (
              <SunIcon className="w-5 h-5 text-[#C7D2E0]" />
            ) : (
              <MoonIcon className="w-5 h-5 text-[#2E5FA7]" />
            )}
          </button>
        </nav>
      </header>

      {/* --- NAV INFERIOR (Solo móvil) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-[#070617]/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex justify-around items-center pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={`flex flex-col items-center text-xs ${
              pathname === href
                  ? 'text-[#0A2A66]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded`}
          >
            <Icon className="w-6 h-6" />
            {label}
          </Link>
        ))}

        {/* Carrito */}
        <button
          type="button"
          onClick={openCartModal}
          className="relative flex flex-col items-center text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ShoppingCartIcon className="w-6 h-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md">
              {totalItems}
            </span>
          )}
          Carrito
        </button>
      </nav>
    </>
  );
};

export default Navbar;

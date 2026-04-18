'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <motion.footer
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="bg-white dark:bg-[#070617] text-slate-900 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          
          {/* 1. Branding y Lema */}
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="inline-block">
              <span className="text-3xl font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:opacity-90 transition-opacity duration-300">
                TALLER DE MOTOS A&amp;R
              </span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Repuestos y accesorios para tu moto.
            </p>
          </div>

          {/* 2. Navegación */}
          <nav>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 tracking-wide">Navegación</h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/', label: 'Inicio' },
                { href: '/products', label: 'Productos' },
                { href: '/about', label: 'Sobre Nosotros' },
                { href: '/contact', label: 'Contacto' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-slate-500 dark:text-slate-400 hover:text-[#0A2A66] transition-colors duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3. Legal y Redes Sociales */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 tracking-wide">Síguenos</h3>
            <div className="flex justify-center md:justify-start gap-4 mb-6">
              <a
                href="https://www.facebook.com/ROBINSON.BOTERO.M/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-[#0A2A66] hover:text-white transition-all duration-300 transform hover:scale-110"
              >
                <FaFacebookF size={18} />
              </a>
              <a
                href="https://www.instagram.com/motoservicioayr/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-[#2E5FA7] hover:text-white transition-all duration-300 transform hover:scale-110"
              >
                <FaInstagram size={18} />
              </a>
            </div>
             <ul className="space-y-3 text-sm">
                <li><Link href="/privacy" className="text-slate-500 dark:text-slate-400 hover:text-[#0A2A66] transition-colors duration-200">Privacidad</Link></li>
                <li><Link href="/terms" className="text-slate-500 dark:text-slate-400 hover:text-[#0A2A66] transition-colors duration-200">Términos y Condiciones</Link></li>
            </ul>
          </div>
        </div>

        <hr className="border-t border-slate-200 dark:border-slate-800 my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
          <p>© {new Date().getFullYear()} TALLER DE MOTOS A&amp;R. Todos los derechos reservados.</p>
          <p>
            Powered by <a href="#" className="font-semibold text-[#0A2A66] hover:underline">FACRISCD</a>
          </p>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
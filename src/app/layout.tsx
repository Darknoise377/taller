// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { CartProvider } from '@/context/CartContext';
import CartModal from '@/components/CartModal';
import Navbar from '@/components/Navbar';
import DynamicFooter from '@/components/DynamicFooter';
import FloatingButtons from '@/components/FloatingButtons';
import { Toaster } from 'sonner';
import { ThemeProvider } from "./theme-provider";
import { getBaseUrl, getBaseUrlAsUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const metadataBase = getBaseUrlAsUrl();
const baseUrl = getBaseUrl();

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TALLER DE MOTOS A&R",
  url: baseUrl,
  logo: `${baseUrl}/logo-ar.svg`,
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+57-310-123-4567",
      contactType: "customer service",
      areaServed: "CO",
      availableLanguage: ["es"],
    },
  ],
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TALLER DE MOTOS A&R",
  url: baseUrl,
  inLanguage: "es-CO",
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/products?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase,
  title: "TALLER DE MOTOS A&R - Repuestos y Accesorios",
  description:
    "Repuestos y accesorios para tu moto en TALLER DE MOTOS A&R. Compra rápida, navegación sencilla y experiencia accesible.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "TALLER DE MOTOS A&R",
    url: "/",
    title: "TALLER DE MOTOS A&R - Repuestos y Accesorios",
    description:
      "Repuestos y accesorios para tu moto en TALLER DE MOTOS A&R. Compra rápida, navegación sencilla y experiencia accesible.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0A2A66" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#070617" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={`${inter.className} m-0 p-0 bg-white text-slate-900 dark:bg-[#070617] dark:text-slate-100`}>
        <ThemeProvider>
          {/* 🔹 CartProvider para estado del carrito */}
          <CartProvider>
            {/* Accesibilidad: salto a contenido */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-white/90 dark:focus:bg-[#070617]/90 focus:text-slate-900 dark:focus:text-slate-100 focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]"
            >
              Saltar al contenido
            </a>
            {/* 🔹 Navbar siempre visible */}
            <Navbar />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
            />
            {/* 🔹 Contenido dinámico */}
            <main id="main-content" className="pb-24 md:pb-0">{children}</main>
            {/* 🔹 Modal del carrito */}
            <CartModal />
            {/* 🔹 Botones flotantes (WhatsApp + Back to top) */}
            <FloatingButtons />
            {/* 🔹 Toast notifications */}
            <Toaster position="top-center" richColors closeButton />
            {/* 🔹 Footer dinámico */}
            <DynamicFooter />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


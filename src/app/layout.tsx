// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from '@/context/CartContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import CartModal from '@/components/CartModal';
import ConditionalNavbar from '@/components/ConditionalNavbar';
import DynamicFooter from '@/components/DynamicFooter';
import AnnouncementBar from '@/components/AnnouncementBar';
import SeasonalGlobalTheme from '@/components/SeasonalGlobalTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';
import FloatingCombos from '@/components/FloatingCombos';
import { Toaster } from 'sonner';
import { ThemeProvider } from "./theme-provider";
import { getBaseUrl, getBaseUrlAsUrl } from "@/lib/site";
import { SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/seo/brand";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const metadataBase = getBaseUrlAsUrl();
const baseUrl = getBaseUrl();

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  name: SITE_NAME,
  url: baseUrl,
  logo: `${baseUrl}/logo.png`,
  image: `${baseUrl}/logo.png`,
  description: "Taller especializado en motos y almacén de repuestos originales y genéricos. Servicio técnico, mantenimiento y venta de partes para todas las marcas.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Calle 27 #14-29",
    addressLocality: "La Ceja",
    addressRegion: "Antioquia",
    addressCountry: "CO",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 6.0333,
    longitude: -75.4333,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+57-301-527-1104",
      contactType: "customer service",
      areaServed: "CO",
      availableLanguage: ["es"],
    },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  sameAs: ["https://www.facebook.com/AlmacenyTallerAYR/", "https://www.instagram.com/motoservicioayr/"],
  priceRange: "$$",
  hasMap: "https://www.google.com/maps/search/?api=1&query=Calle+27+%2314-29+La+Ceja+Antioquia+Colombia",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: baseUrl,
  inLanguage: "es-CO",
  description: "Repuestos para motos, servicio técnico especializado y accesorios. Atendemos todas las marcas en La Ceja, Antioquia.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/products?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: `${SITE_NAME} | Repuestos y Servicio Técnico`,
    template: `%s | ${SITE_NAME}`,
  },
  verification: {
    google: 'LrpGkdzMiwUUroB6f4C6m3xBPZRa749YcGknw0_Rvjo',
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo.png", sizes: "any" },
    ],
    shortcut: "/icon.svg",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: SITE_NAME,
    url: "/",
    title: `${SITE_NAME} | Repuestos y Servicio Técnico`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${baseUrl}/og-home.jpg`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Repuestos y Servicio Técnico`,
    description: SITE_DESCRIPTION,
    images: [`${baseUrl}/og-home.jpg`],
    creator: '@motoservicioayr',
    site: '@motoservicioayr',
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
          <CustomerAuthProvider initialUser={null}>
            {/* 🔹 CartProvider para estado del carrito */}
            <CartProvider>
              {/* Accesibilidad: salto a contenido */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-white/90 dark:focus:bg-[#070617]/90 focus:text-slate-900 dark:focus:text-slate-100 focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66]"
              >
                Saltar al contenido
              </a>
              {/* 🔹 Barra de anuncios rotatoria */}
              <AnnouncementBar />
              {/* 🔹 Navbar (oculto en /admin a través de ConditionalNavbar) */}
              <ConditionalNavbar />
              {/* 🔹 Tema global por temporada (Mundial, Halloween, Navidad, etc.) */}
              <SeasonalGlobalTheme />
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
              />
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
              />
              {/* 🔹 Contenido dinámico */}
              <main id="main-content" className="pb-24 md:pb-0">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              {/* 🔹 Modal del carrito */}
              <CartModal />
              {/* 🔹 Botones flotantes + Asistente IA (solo cliente) */}
              <ClientOnlyWidgets />
              {/* 🔹 Panel flotante de combos (siempre visible) */}
              <FloatingCombos />
              {/* 🔹 Toast notifications */}
              <Toaster position="top-center" richColors closeButton />
              {/* 🔹 Footer dinámico */}
              <DynamicFooter />
              {/* Vercel Speed Insights: solo activo en producción */}
              {process.env.NODE_ENV === 'production' && <SpeedInsights />}
              {/* Vercel Analytics: conteo de visitas y páginas */}
              {process.env.NODE_ENV === 'production' && <Analytics />}
            </CartProvider>
          </CustomerAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


// src/app/products/page.tsx
import type { Metadata } from "next";
import { Product } from "@/types/product";
import ProductsClient from "./products-client";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/site";
import { getProductCategoryLabel, isProductCategory } from "@/constants/productCategories";

// Evita que `next build` intente prerenderizar con acceso a DB.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Catálogo de Repuestos y Accesorios para Moto | TALLER DE MOTOS A&R",
  description:
    "Compra repuestos y accesorios para moto en Colombia. Consulta precios, stock y referencias disponibles en nuestro catálogo online.",
  alternates: {
    canonical: "/products",
  },
  openGraph: {
    title: "Catálogo de Repuestos y Accesorios para Moto | TALLER DE MOTOS A&R",
    description:
      "Explora repuestos y accesorios para moto con stock visible, precios claros y compra online en Colombia.",
    url: "/products",
    type: "website",
    locale: "es_CO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catálogo de Repuestos y Accesorios para Moto | TALLER DE MOTOS A&R",
    description:
      "Explora repuestos y accesorios para moto con stock visible y compra online en Colombia.",
  },
};

export default async function ProductsPage() {
  let rawProducts: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    imageUrl: string | null;
    images: string[] | null;
    category: string;
    sizes: string[] | null;
    colors: string[] | null;
    stock: number | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  try {
    // Limitar la consulta inicial para evitar cargar toda la colección en memoria
    const limit = 24;
    rawProducts = await prisma.product.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        imageUrl: true,
        images: true,
        category: true,
        sizes: true,
        colors: true,
        stock: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.error("Error al consultar productos (BD no disponible):", err);
    rawProducts = [];
  }

  // Total de productos (para paginación / UI)
  let totalCount = 0;
  try {
    totalCount = await prisma.product.count();
  } catch (err) {
    console.error('No se pudo obtener el total de productos:', err);
  }

  const products: Product[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    price: p.price,
    currency: (["USD", "EUR", "COP"].includes(p.currency)
      ? p.currency
      : "COP") as Product["currency"],
    imageUrl: p.imageUrl ?? p.images?.[0] ?? "",
    images: p.images ?? [],
    category: (isProductCategory(p.category) ? p.category : "accesorios") as Product["category"],
    sizes: (p.sizes ?? []) as Product["sizes"],
    colors: p.colors ?? [],
    stock: p.stock ?? 0,
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
  }));

  const baseUrl = getBaseUrl();
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Catálogo de repuestos y accesorios",
    url: `${baseUrl}/products`,
    description:
      "Explora repuestos y accesorios para moto con precios visibles, stock actualizado y compra online en Colombia.",
    inLanguage: "es-CO",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 24).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/products/${product.id}`,
        name: product.name,
      })),
    },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 24).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        url: `${baseUrl}/products/${product.id}`,
        image: toAbsoluteUrl(product.images?.[0] || product.imageUrl || "/placeholder.png", baseUrl),
        category: getProductCategoryLabel(product.category),
        offers: {
          "@type": "Offer",
          priceCurrency: product.currency,
          price: product.price,
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {/* Hero banner */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#050F2C] via-[#0A2A66] to-[#0d3580] py-4 sm:py-7 md:py-10 px-4">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle,_#fff_1px,_transparent_1px)] [background-size:20px_20px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050F2C]/50" aria-hidden />
        <div className="relative max-w-7xl mx-auto z-10">
          {/* Mobile: compact one-liner strip */}
          <div className="flex items-center justify-between gap-4 md:hidden">
            <div>
              <p className="text-[#7BA4D9] text-[10px] font-bold uppercase tracking-widest mb-0.5">Catálogo completo</p>
              <h1 className="text-xl font-black text-white tracking-tight leading-tight">
                Repuestos <span className="text-[#4A8FE2]">&amp; Accesorios</span>
              </h1>
            </div>
            <div className="flex gap-4 shrink-0">
              <div className="text-center">
                <p className="text-base font-black text-white">{totalCount}+</p>
                <p className="text-[#7BA4D9] text-[10px] font-semibold">Productos</p>
              </div>
              <div className="text-center">
                <p className="text-base font-black text-white">14</p>
                <p className="text-[#7BA4D9] text-[10px] font-semibold">Categ.</p>
              </div>
            </div>
          </div>

          {/* Desktop: full hero with description + stats */}
          <div className="hidden md:flex md:items-center md:justify-between gap-6">
            <div>
              <p className="text-[#7BA4D9] text-xs font-bold uppercase tracking-widest mb-2">Catálogo completo</p>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Repuestos <span className="text-[#4A8FE2]">&amp; Accesorios</span>
              </h1>
              <p className="mt-2 text-[#9DC0E8] text-sm sm:text-base max-w-xl">
                Stock actualizado, precios visibles y despacho a todo Colombia.
              </p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-3xl font-black text-white">{totalCount}+</p>
                <p className="text-[#7BA4D9] text-xs font-semibold mt-0.5">Productos</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-white">14</p>
                <p className="text-[#7BA4D9] text-xs font-semibold mt-0.5">Categorías</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-white">COL</p>
                <p className="text-[#7BA4D9] text-xs font-semibold mt-0.5">Colombia</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <ProductsClient initialProducts={products} totalCount={totalCount} />
    </>
  );
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

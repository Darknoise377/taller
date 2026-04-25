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
    id: number;
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
      <ProductsClient initialProducts={products} totalCount={totalCount} />
    </>
  );
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

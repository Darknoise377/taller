// src/app/products/[id]/page.tsx
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import type { Product } from "@/types/product";
import { cache } from "react";
import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { getProductCategoryLabel, isProductCategory } from "@/constants/productCategories";

// La interfaz sigue siendo la misma
interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 60;

const getProductById = cache(async (id: number) => {
  return prisma.product.findUnique({
    where: { id },
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
});

const getRelatedProducts = cache(async (category: string, excludeId: number) => {
  return prisma.product.findMany({
    where: {
      category: category as never,
      NOT: { id: excludeId },
    },
    take: 4,
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
});

// ✅ Metadata dinámico para SEO
export async function generateMetadata(
  { params }: ProductPageProps
): Promise<Metadata> {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return {
      title: "Producto no encontrado",
      description: "Este producto no existe en la tienda.",
    };
  }

  let product: Awaited<ReturnType<typeof getProductById>> = null;
  try {
    product = await getProductById(id);
  } catch (err) {
    console.error("Error consultando producto (BD no disponible):", err);
    return {
      title: "Producto",
      description:
        "No pudimos cargar este producto en este momento. Intenta de nuevo más tarde.",
    };
  }

  if (!product) {
    return {
      title: "Producto no encontrado",
      description: "Este producto no existe en la tienda.",
    };
  }

  const description =
    product.description?.slice(0, 150) ||
    `Compra ${product.name} al mejor precio en nuestra tienda.`;
  const productPath = `/products/${product.id}`;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: productPath,
    },
    openGraph: {
      title: product.name,
      description,
      url: productPath,
      type: "website",
      images: [
        {
          url: product.images?.[0] || product.imageUrl || "/placeholder.png",
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [product.images?.[0] || product.imageUrl || "/placeholder.png"],
    },
  };
}

// ✅ Página del producto
export default async function ProductPage({ params }: ProductPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return notFound();

  let productRaw: Awaited<ReturnType<typeof getProductById>> = null;
  try {
    productRaw = await getProductById(id);
  } catch (err) {
    console.error("Error consultando producto (BD no disponible):", err);
    return (
      <div className="min-h-screen bg-white text-slate-900 dark:bg-[#070617] dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="glass p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              No se pudo cargar el producto
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              La base de datos no está disponible en este momento. Puedes seguir
              navegando y volver a intentar más tarde.
            </p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold shadow-lg"
              >
                Ver productos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!productRaw) return notFound();

  // Normalizamos los datos para que coincidan con la interfaz 'Product' del frontend
  const product: Product = {
    ...productRaw,
    description: productRaw.description ?? undefined,
    imageUrl: productRaw.imageUrl ?? undefined,
    currency: (productRaw.currency || "COP") as "USD" | "EUR" | "COP",
    sizes: productRaw.sizes || [],
    // Convertimos las fechas a string para serialización
    createdAt: productRaw.createdAt.toISOString(),
    updatedAt: productRaw.updatedAt.toISOString(),
    category: (isProductCategory(productRaw.category) ? productRaw.category : 'accesorios') as Product['category'],
  };

  let relatedProductsRaw: Awaited<ReturnType<typeof getRelatedProducts>> = [];
  try {
    relatedProductsRaw = await getRelatedProducts(String(productRaw.category), productRaw.id);
  } catch (err) {
    console.error("Error consultando relacionados (BD no disponible):", err);
    relatedProductsRaw = [];
  }

  const relatedProducts: Product[] = relatedProductsRaw.map((p) => ({
    ...p,
    description: p.description ?? undefined,
    imageUrl: p.imageUrl ?? undefined,
    currency: (p.currency || "COP") as "USD" | "EUR" | "COP",
    sizes: p.sizes || [],
    // Convertimos también las fechas de los productos relacionados
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    category: (isProductCategory(p.category) ? p.category : 'accesorios') as Product['category'],
  }));

  const baseUrl = getBaseUrl();
  const productUrl = `${baseUrl}/products/${product.id}`;
  const imageUrls = imagesToAbsoluteUrls(product.images, product.imageUrl, baseUrl);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    url: productUrl,
    name: product.name,
    image: imageUrls,
    description: product.description ?? `Compra ${product.name} al mejor precio en nuestra tienda.`,
    sku: String(product.id),
    category: getProductCategoryLabel(product.category),
    brand: {
      "@type": "Brand",
      name: "TALLER DE MOTOS A&R",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: product.currency || "COP",
      price: product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "TALLER DE MOTOS A&R",
      },
    },
    additionalProperty: [
      ...(product.sizes.length > 0
        ? [{ "@type": "PropertyValue", name: "Tallas disponibles", value: product.sizes.join(", ") }]
        : []),
      ...(product.colors.length > 0
        ? [{ "@type": "PropertyValue", name: "Colores disponibles", value: product.colors.join(", ") }]
        : []),
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Productos",
        item: `${baseUrl}/products`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

function imagesToAbsoluteUrls(images: string[] | undefined, fallback: string | undefined, baseUrl: string): string[] {
  const imageCandidates = images && images.length > 0 ? images : [fallback || "/placeholder.png"];
  return imageCandidates.map((image) => toAbsoluteUrl(image, baseUrl));
}
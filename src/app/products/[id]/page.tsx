// src/app/products/[id]/page.tsx
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound, permanentRedirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import type { Product } from "@/types/product";
import { cache } from "react";
import Link from "next/link";
import { getBaseUrl } from "@/lib/site";
import { SITE_NAME } from "@/lib/seo/brand";
import { getProductCategoryLabel, isProductCategory } from "@/constants/productCategories";
import { isUUID } from "@/lib/seo/slug";

// La interfaz sigue siendo la misma
interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 60;

/** Pre-generate top 100 products (by stock) at build time */
export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, slug: true },
      orderBy: { stock: 'desc' },
      take: 100,
    });
    return products.map((p) => ({ id: p.slug ?? p.id }));
  } catch {
    return [];
  }
}

const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  currency: true,
  imageUrl: true,
  images: true,
  videoUrl: true,
  category: true,
  sizes: true,
  colors: true,
  stock: true,
  sku: true,
  brand: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Looks up a product by slug (non-UUID) or by id (UUID). */
const getProductBySlugOrId = cache(async (param: string) => {
  if (isUUID(param)) {
    return prisma.product.findUnique({ where: { id: param }, select: productSelect });
  }
  return prisma.product.findUnique({ where: { slug: param }, select: productSelect });
});

const getRelatedProducts = cache(async (category: string, excludeId: string) => {
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
      videoUrl: true,
      category: true,
      sizes: true,
      colors: true,
      stock: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  });
});

const getReviewStats = cache(async (productId: string) => {
  try {
    const stats = await prisma.review.aggregate({
      where: { productId, approved: true },
      _avg: { rating: true },
      _count: { id: true },
    });
    return {
      average: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
      count: stats._count.id ?? 0,
    };
  } catch {
    return { average: 0, count: 0 };
  }
});

const getRecentReviews = cache(async (productId: string, limit = 5) => {
  try {
    return await prisma.review.findMany({
      where: { productId, approved: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, rating: true, comment: true, author: true, createdAt: true, verifiedPurchase: true },
    });
  } catch {
    return [];
  }
});

// ✅ Metadata dinámico para SEO
export async function generateMetadata(
  { params }: ProductPageProps
): Promise<Metadata> {
  const { id: idParam } = await params;
  const id = String(idParam);
  if (!id) {
    return {
      title: "Producto no encontrado",
      description: "Este producto no existe en la tienda.",
    };
  }

  let product: Awaited<ReturnType<typeof getProductBySlugOrId>> = null;
  try {
    product = await getProductBySlugOrId(id);
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
  const baseUrl = getBaseUrl();

  const firstImage = product.images?.[0] || product.imageUrl || "/placeholder.png";
  const ogImage = firstImage.startsWith("http")
    ? firstImage
    : `${baseUrl}${firstImage.startsWith("/") ? "" : "/"}${firstImage}`;

  const canonicalSlug = product.slug ?? product.id;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/products/${canonicalSlug}`,
    },
    openGraph: {
      title: product.name,
      description,
      url: `/products/${canonicalSlug}`,
      // type se define como "product" en `other` (valor no-estándar no soportado por el tipo TS de Next.js)
      images: [
        {
          url: ogImage,
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
      images: [ogImage],
    },
    // Meta tags de producto para Facebook / Google Shopping
    other: {
      "og:type": "product",
      "product:price:amount": String(product.price),
      "product:price:currency": product.currency ?? "COP",
      "product:availability": product.stock > 0 ? "in stock" : "out of stock",
      "product:condition": "new",
      ...(product.sku?.trim() ? { "product:retailer_item_id": product.sku.trim() } : {}),
    },
  };
}

// ✅ Página del producto
export default async function ProductPage({ params }: ProductPageProps) {
  const { id: idParam } = await params;
  const id = String(idParam);
  if (!id) return notFound();

  let productRaw: Awaited<ReturnType<typeof getProductBySlugOrId>> = null;
  try {
    productRaw = await getProductBySlugOrId(id);
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

  // 308 redirect: if accessed by UUID and product has a slug URL, redirect permanently
  if (isUUID(id) && productRaw.slug) {
    permanentRedirect(`/products/${productRaw.slug}`);
  }

  const product: Product = {
    id: productRaw.id,
    name: productRaw.name,
    description: productRaw.description ?? undefined,
    price: productRaw.price,
    imageUrl: productRaw.imageUrl ?? undefined,
    images: productRaw.images ?? [],
    videoUrl: productRaw.videoUrl ?? null,
    currency: (productRaw.currency || 'COP') as 'USD' | 'EUR' | 'COP',
    sizes: productRaw.sizes || [],
    colors: productRaw.colors || [],
    stock: productRaw.stock,
    slug: productRaw.slug ?? undefined,
    createdAt: productRaw.createdAt.toISOString(),
    updatedAt: productRaw.updatedAt.toISOString(),
    category: (isProductCategory(productRaw.category) ? productRaw.category : 'accesorios') as Product['category'],
    sku: productRaw.sku ?? undefined,
    brand: productRaw.brand ?? undefined,
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
    videoUrl: p.videoUrl ?? null,
    currency: (p.currency || "COP") as "USD" | "EUR" | "COP",
    sizes: p.sizes || [],
    slug: p.slug ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    category: (isProductCategory(p.category) ? p.category : 'accesorios') as Product['category'],
  }));

  const baseUrl = getBaseUrl();
  const canonicalSlug = product.slug ?? product.id;
  const productUrl = `${baseUrl}/products/${canonicalSlug}`;
  const imageUrls = imagesToAbsoluteUrls(product.images, product.imageUrl, baseUrl);

  const [reviewStats, recentReviews] = await Promise.all([
    getReviewStats(product.id),
    getRecentReviews(product.id),
  ]);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    url: productUrl,
    name: product.name,
    image: imageUrls,
    description: product.description ?? `Compra ${product.name} al mejor precio en nuestra tienda.`,
    sku: productRaw.sku?.trim() || product.id,
    ...(productRaw.sku?.trim() ? { mpn: productRaw.sku.trim() } : {}),
    category: getProductCategoryLabel(product.category),
    brand: {
      "@type": "Brand",
      name: productRaw.brand?.trim() || SITE_NAME,
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
        name: SITE_NAME,
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
    ...(reviewStats.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: reviewStats.average,
        reviewCount: reviewStats.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(recentReviews.length > 0 && {
      review: recentReviews.map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        datePublished: r.createdAt.toISOString().split('T')[0],
        reviewBody: r.comment ?? '',
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
      })),
    }),
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
        name: getProductCategoryLabel(product.category),
        item: `${baseUrl}/products/category/${product.category}`,
      },
      {
        "@type": "ListItem",
        position: 4,
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
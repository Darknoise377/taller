import type { Metadata } from 'next';
import ProductsClient from './products-client';
import { getCatalogProducts } from '@/lib/seo/queries';
import { getBaseUrl } from '@/lib/site';
import { getProductCategoryLabel, isProductCategory } from '@/constants/productCategories';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo/brand';
export const revalidate = 3600;

type PageProps = {
  searchParams: Promise<{ q?: string; search?: string; category?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q?.trim() || params.search?.trim();
  const category = params.category?.trim();

  if (category && isProductCategory(category)) {
    const label = getProductCategoryLabel(category);
    return {
      title: `${label} para moto`,
      description: `Compra ${label.toLowerCase()} para moto en Colombia. ${SITE_NAME}.`,
      alternates: { canonical: `/products/category/${category}` },
      twitter: {
        card: 'summary_large_image',
        title: `${label} para moto | ${SITE_NAME}`,
        description: `Catálogo de ${label.toLowerCase()} para moto en Colombia.`,
      },
    };
  }

  if (q) {
    return {
      title: `Buscar: ${q}`,
      description: `Resultados de búsqueda para «${q}» en el catálogo de repuestos para moto.`,
      alternates: { canonical: '/products' },
      robots: { index: false, follow: true },
    };
  }

  return {
    title: 'Catálogo de repuestos y accesorios para moto',
    description:
      'Compra repuestos y accesorios para moto en Colombia. Consulta precios, stock y referencias disponibles en nuestro catálogo online.',
    alternates: { canonical: '/products' },
    openGraph: {
      title: `Catálogo de repuestos | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      url: '/products',
      type: 'website',
      locale: 'es_CO',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Catálogo de repuestos y accesorios para moto | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
    },
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const categoryParam = params.category?.trim();

  if (categoryParam && isProductCategory(categoryParam)) {
    const { redirect } = await import('next/navigation');
    redirect(`/products/category/${categoryParam}`);
  }

  const { products, totalCount } = await getCatalogProducts({ limit: 20 });
  const baseUrl = getBaseUrl();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Catálogo de repuestos y accesorios',
    url: `${baseUrl}/products`,
    description: SITE_DESCRIPTION,
    inLanguage: 'es-CO',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: totalCount,
      itemListElement: products.slice(0, 48).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${baseUrl}/products/${product.slug ?? product.id}`,
        name: product.name,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <header className="relative overflow-hidden bg-gradient-to-br from-[#050F2C] via-[#0A2A66] to-[#0d3580] py-4 sm:py-7 md:py-10 px-4">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle,_#fff_1px,_transparent_1px)] [background-size:20px_20px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050F2C]/50" aria-hidden />
        <div className="relative max-w-7xl mx-auto z-10">
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
            </div>
          </div>
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
            </div>
          </div>
        </div>
      </header>
      <ProductsClient initialProducts={products} totalCount={totalCount} />
    </>
  );
}

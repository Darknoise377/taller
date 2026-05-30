import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductsClient from '../../products-client';
import { getCatalogProducts } from '@/lib/seo/queries';
import { getProductCategoryLabel, isProductCategory, getProductCategoryDescription } from '@/constants/productCategories';
import { getBaseUrl } from '@/lib/site';
import { SITE_NAME } from '@/lib/seo/brand';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!isProductCategory(category)) {
    return { title: 'Categoría no encontrada' };
  }
  const label = getProductCategoryLabel(category);
  return {
    title: `${label} para moto`,
    description: `Compra ${label.toLowerCase()} para moto con stock visible y envíos a Colombia. ${SITE_NAME}, La Ceja.`,
    alternates: { canonical: `/products/category/${category}` },
    openGraph: {
      title: `${label} | ${SITE_NAME}`,
      description: `Catálogo de ${label.toLowerCase()} para moto en Colombia.`,
      url: `/products/category/${category}`,
      type: 'website',
      locale: 'es_CO',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${label} para moto | ${SITE_NAME}`,
      description: `Catálogo de ${label.toLowerCase()} para moto. Stock visible y envíos a Colombia.`,
    },
  };
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (!isProductCategory(category)) notFound();

  const { products, totalCount } = await getCatalogProducts({ limit: 48, category });
  const baseUrl = getBaseUrl();
  const label = getProductCategoryLabel(category);

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${label} para moto`,
    url: `${baseUrl}/products/category/${category}`,
    description: `Repuestos de ${label.toLowerCase()} para moto en ${SITE_NAME}.`,
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

  const categoryDescription = getProductCategoryDescription(category);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <header className="relative overflow-hidden bg-gradient-to-br from-[#050F2C] via-[#0A2A66] to-[#0d3580] py-4 sm:py-7 md:py-10 px-4">
        <div className="relative max-w-7xl mx-auto z-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#7BA4D9' }}>Categoría</p>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{label}</h1>
          <p className="mt-2 text-[#9DC0E8] text-sm max-w-xl">
            {totalCount} productos disponibles · Envíos a Colombia
          </p>
          {categoryDescription && (
            <p className="mt-3 text-[#C8DCEF] text-sm max-w-xl leading-relaxed">
              {categoryDescription}
            </p>
          )}
        </div>
      </header>
      <ProductsClient
        initialProducts={products}
        totalCount={totalCount}
        initialCategory={category}
      />
    </>
  );
}

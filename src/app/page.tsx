import type { Metadata } from 'next';
import HomePageClient from '@/components/home/HomePageClient';
import {
  getCategoriesForSeo,
  getHomeSliderProducts,
  getFeaturedProductsForHome,
  getFeaturedCombosForHome,
  getProductsForHomeSearch,
} from '@/lib/seo/queries';
import { SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/seo/brand';
import { getBaseUrl } from '@/lib/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Repuestos para moto y servicio técnico en La Ceja',
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME} | Repuestos y servicio técnico`,
    description: SITE_DESCRIPTION,
    url: '/',
    type: 'website',
    locale: 'es_CO',
    images: [{ url: '/logo.png', width: 800, height: 600, alt: SITE_NAME }],
  },
};

export default async function HomePage() {
  const [
    initialCategories,
    initialSliderProducts,
    initialFeaturedProducts,
    initialFeaturedCombos,
    searchCatalog,
  ] = await Promise.all([
    getCategoriesForSeo(),
    getHomeSliderProducts(),
    getFeaturedProductsForHome(8),
    getFeaturedCombosForHome(6),
    getProductsForHomeSearch(),
  ]);

  const baseUrl = getBaseUrl();
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: SITE_NAME,
    url: baseUrl,
    description: SITE_DESCRIPTION,
    inLanguage: 'es-CO',
    isPartOf: { '@type': 'WebSite', url: baseUrl, name: SITE_NAME },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <HomePageClient
        initialCategories={initialCategories}
        initialSliderProducts={initialSliderProducts.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? '',
          images: p.images ?? [],
        }))}
        initialFeaturedProducts={initialFeaturedProducts}
        initialFeaturedCombos={initialFeaturedCombos}
        searchCatalog={searchCatalog}
      />
    </>
  );
}

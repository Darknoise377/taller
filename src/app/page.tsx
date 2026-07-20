import type { Metadata } from 'next';
import HomePageOptimized from '@/components/home/HomePageOptimized';
import {
  getCategoriesForSeo,
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
    images: [{ url: '/og-home.jpg', width: 1200, height: 630, alt: `${SITE_NAME} | Repuestos y servicio técnico en La Ceja` }],
  },
};

export default async function HomePage() {
  const [
    initialCategories,
    initialFeaturedProducts,
    initialFeaturedCombos,
    searchCatalog,
  ] = await Promise.all([
    getCategoriesForSeo(),
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
      <HomePageOptimized
        initialCategories={initialCategories}
        initialFeaturedProducts={initialFeaturedProducts}
        initialFeaturedCombos={initialFeaturedCombos}
        searchCatalog={searchCatalog}
      />
    </>
  );
}

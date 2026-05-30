import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ComboDetailClient from './combo-detail-client';
import { getComboBySlugForSeo } from '@/lib/seo/queries';
import { getBaseUrl } from '@/lib/site';
import { SITE_NAME } from '@/lib/seo/brand';
import { toAbsoluteImageUrl } from '@/lib/seo/urls';

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const combo = await getComboBySlugForSeo(slug);
  if (!combo) {
    return { title: 'Combo no encontrado' };
  }

  const description = combo.description.slice(0, 160);
  const image = combo.imageUrl || combo.images?.[0];

  return {
    title: combo.name,
    description,
    alternates: { canonical: `/combos/${combo.slug}` },
    openGraph: {
      title: combo.name,
      description,
      url: `/combos/${combo.slug}`,
      type: 'website',
      locale: 'es_CO',
      images: image
        ? [{ url: toAbsoluteImageUrl(image), width: 1200, height: 630, alt: combo.name }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: combo.name,
      description,
      images: image ? [toAbsoluteImageUrl(image)] : undefined,
    },
  };
}

export default async function ComboDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const combo = await getComboBySlugForSeo(slug);
  if (!combo) notFound();

  const baseUrl = getBaseUrl();
  const comboUrl = `${baseUrl}/combos/${combo.slug}`;
  const imageUrl = combo.imageUrl || combo.images?.[0];

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: combo.name,
    description: combo.description,
    url: comboUrl,
    image: imageUrl ? toAbsoluteImageUrl(imageUrl) : undefined,
    sku: combo.id,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: comboUrl,
      priceCurrency: combo.currency || 'COP',
      price: combo.price,
      availability:
        combo.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Combos', item: `${baseUrl}/combos` },
      { '@type': 'ListItem', position: 3, name: combo.name, item: comboUrl },
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
      <ComboDetailClient combo={combo} />
    </>
  );
}

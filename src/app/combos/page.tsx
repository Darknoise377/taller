import { getActiveCombosList } from '@/lib/seo/queries';
import { getBaseUrl } from '@/lib/site';
import CombosClient from './combos-client';

export const revalidate = 3600;

export default async function CombosPage() {
  const combos = await getActiveCombosList();
  const baseUrl = getBaseUrl();

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Combos y ofertas',
    numberOfItems: combos.length,
    itemListElement: combos.map((combo, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${baseUrl}/combos/${combo.slug}`,
      name: combo.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <CombosClient combos={combos} />
    </>
  );
}

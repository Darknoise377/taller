import type { Metadata } from 'next';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo/brand';

export const metadata: Metadata = {
  title: 'Combos y ofertas especiales',
  description: `Combos de repuestos para moto con regalo sorpresa y ahorro. ${SITE_DESCRIPTION}`,
  alternates: { canonical: '/combos' },
  openGraph: {
    title: `Combos y ofertas | ${SITE_NAME}`,
    url: '/combos',
    type: 'website',
    locale: 'es_CO',
  },
};

export default function CombosLayout({ children }: { children: React.ReactNode }) {
  return children;
}

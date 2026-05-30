import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/seo/brand';

export const metadata: Metadata = {
  title: 'Seguimiento de pedido',
  description: `Consulta el estado de tu pedido en ${SITE_NAME}.`,
  alternates: { canonical: '/seguimiento' },
  robots: { index: true, follow: true },
};

export default function SeguimientoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

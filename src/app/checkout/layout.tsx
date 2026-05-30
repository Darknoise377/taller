import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/seo/brand';

export const metadata: Metadata = {
  title: 'Finalizar compra',
  description: `Completa tu pedido de repuestos para moto en ${SITE_NAME}.`,
  robots: { index: false, follow: false },
  alternates: { canonical: '/checkout' },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

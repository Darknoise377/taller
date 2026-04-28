import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RepuestosPage() {
  // Redirige a la página principal de productos para evitar duplicación
  redirect('/products');
}

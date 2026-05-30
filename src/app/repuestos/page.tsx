import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RepuestosPage() {
  // Redirige permanentemente (308) para transferir link equity a la página principal de productos
  permanentRedirect('/products');
}

// src/hooks/useProducts.ts
import useSWR, { mutate } from 'swr';
import { Product } from '@/types/product';

const fetcher = async (url: string): Promise<Product[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar productos');
  const data = await res.json();
  return data as Product[];
};

export default function useProducts() {
  const { data, error, isLoading } = useSWR<Product[]>(
    '/api/products',
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 5000 }
  );

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error al actualizar producto');
    const updated = (await res.json()) as Product;
    mutate('/api/products');
    return updated;
  };

  const deleteProduct = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar producto');
    mutate('/api/products');
  };

  return {
    products: data ?? [],
    loading: !!isLoading,
    error,
    updateProduct,
    deleteProduct,
  };
}

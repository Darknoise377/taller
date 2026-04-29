// src/services/productService.ts
import { Product } from '@/types/product';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const productService = {
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error('Error al obtener productos');
    const json = await res.json();
    // Soportar ambos formatos: array legacy o objeto paginado { items, total }
    if (Array.isArray(json)) return json as Product[];
    if (json && Array.isArray(json.items)) return json.items as Product[];
    throw new Error('Respuesta de productos inválida');
  },

  async getProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (!res.ok) throw new Error('Error al obtener producto');
    return (await res.json()) as Product; // 👈 Casting
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Error al crear producto');
    return (await res.json()) as Product; // 👈 Casting
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Error al actualizar producto');
    return (await res.json()) as Product; // 👈 Casting
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar producto');
  },
};

// --- SUBIDA DE IMÁGENES ---
// --- SUBIDA DE IMÁGENES ---
export async function uploadImage(file: File): Promise<{ url: string; public_id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Error al subir la imagen');
  const data = await res.json();

  // ⚡ Normalizamos siempre a { url, public_id }
  return {
    url: data.url || data.secure_url, // 👈 soporte doble
    public_id: data.public_id ?? '',
  };
}

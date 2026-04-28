import test from 'node:test';
import assert from 'node:assert/strict';

import { productService } from '../src/services/productService';

test('productService.getProducts fetches and returns products', async () => {
  const sample = [
    {
      id: 1,
      name: 'Prueba Producto',
      description: 'Descripción',
      price: 1000,
      currency: 'COP',
      imageUrl: '',
      images: [],
      sku: null,
      tags: [],
      diagramNumber: null,
      category: 'accesorios',
      sizes: [],
      colors: [],
      stock: 10,
    },
  ];

  const originalFetch = (global as any).fetch;
  (global as any).fetch = async (url: string) => ({
    ok: true,
    json: async () => sample,
  } as any);

  try {
    const products = await productService.getProducts();
    assert.ok(Array.isArray(products));
    assert.equal(products.length, 1);
    assert.equal(products[0].name, 'Prueba Producto');
  } finally {
    (global as any).fetch = originalFetch;
  }
});

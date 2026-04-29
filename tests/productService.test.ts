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

  const globalObj = global as unknown as Record<string, unknown>;
  const originalFetch = globalObj.fetch;
  globalObj.fetch = async () => ({
    ok: true,
    json: async () => sample,
  }) as unknown;

  try {
    const products = await productService.getProducts();
    assert.ok(Array.isArray(products));
    assert.equal(products.length, 1);
    assert.equal(products[0].name, 'Prueba Producto');
  } finally {
    globalObj.fetch = originalFetch;
  }
});

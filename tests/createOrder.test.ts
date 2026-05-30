import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  consolidateProductLines,
  consolidateComboLines,
  CreateOrderError,
  generateBrandedReferenceCode,
} from '../src/lib/orders/createOrder';

describe('consolidateProductLines', () => {
  it('merges duplicate product ids', () => {
    const map = consolidateProductLines([
      { productId: 'a', quantity: 2 },
      { productId: 'a', quantity: 1 },
      { productId: 'b', quantity: 1 },
    ]);
    assert.equal(map.get('a'), 3);
    assert.equal(map.get('b'), 1);
  });

  it('throws on invalid product id', () => {
    assert.throws(
      () => consolidateProductLines([{ productId: '', quantity: 1 }]),
      (err: unknown) => err instanceof CreateOrderError && err.code === 'INVALID_PRODUCT',
    );
  });

  it('throws on invalid quantity', () => {
    assert.throws(
      () => consolidateProductLines([{ productId: 'x', quantity: 0 }]),
      (err: unknown) => err instanceof CreateOrderError && err.code === 'INVALID_QUANTITY',
    );
  });
});

describe('consolidateComboLines', () => {
  it('merges duplicate combo ids', () => {
    const map = consolidateComboLines([
      { comboId: 'c1', quantity: 1 },
      { comboId: 'c1', quantity: 2 },
    ]);
    assert.equal(map.get('c1'), 3);
  });
});

describe('generateBrandedReferenceCode', () => {
  it('uses AR- prefix', () => {
    const code = generateBrandedReferenceCode();
    assert.match(code, /^AR-\d+-[A-Z0-9]+$/);
  });
});

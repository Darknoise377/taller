import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDiscountedTotal,
  clampPercentage,
  formatCurrency,
  normalizeAmount,
} from '../src/utils/formatCurrency';

test('normalizeAmount rounds safely', () => {
  assert.equal(normalizeAmount(12.345), 12.35);
  assert.equal(normalizeAmount(12.344), 12.34);
  assert.equal(normalizeAmount(Number.NaN), 0);
});

test('clampPercentage keeps values between 0 and 100', () => {
  assert.equal(clampPercentage(-10), 0);
  assert.equal(clampPercentage(25.555), 25.56);
  assert.equal(clampPercentage(150), 100);
});

test('calculateDiscountedTotal applies discount consistently', () => {
  const result = calculateDiscountedTotal(100000, 10);

  assert.equal(result.discountAmount, 10000);
  assert.equal(result.finalTotal, 90000);
});

test('formatCurrency formats COP amounts for Colombia', () => {
  assert.match(formatCurrency(15000, 'COP'), /15/);
  assert.match(formatCurrency(15000, 'COP'), /COP|\$/);
});

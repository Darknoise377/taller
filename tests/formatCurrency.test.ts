import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateDiscountedTotal,
  clampPercentage,
  formatCurrency,
  normalizeAmount,
} from '../src/utils/formatCurrency';

// ── normalizeAmount ───────────────────────────────────────────────────────────

test('normalizeAmount rounds safely', () => {
  assert.equal(normalizeAmount(12.345), 12.35);
  assert.equal(normalizeAmount(12.344), 12.34);
  assert.equal(normalizeAmount(Number.NaN), 0);
});

test('normalizeAmount handles negative numbers', () => {
  assert.equal(normalizeAmount(-5.555), -5.55);
  assert.equal(normalizeAmount(-0), 0);
});

test('normalizeAmount handles zero', () => {
  assert.equal(normalizeAmount(0), 0);
});

test('normalizeAmount handles Infinity', () => {
  assert.equal(normalizeAmount(Infinity), 0);
  assert.equal(normalizeAmount(-Infinity), 0);
});

// ── clampPercentage ───────────────────────────────────────────────────────────

test('clampPercentage keeps values between 0 and 100', () => {
  assert.equal(clampPercentage(-10), 0);
  assert.equal(clampPercentage(25.555), 25.56);
  assert.equal(clampPercentage(150), 100);
});

test('clampPercentage handles boundary values', () => {
  assert.equal(clampPercentage(0), 0);
  assert.equal(clampPercentage(100), 100);
});

test('clampPercentage handles NaN', () => {
  assert.equal(clampPercentage(Number.NaN), 0);
});

// ── calculateDiscountedTotal ──────────────────────────────────────────────────

test('calculateDiscountedTotal applies discount consistently', () => {
  const result = calculateDiscountedTotal(100000, 10);

  assert.equal(result.discountAmount, 10000);
  assert.equal(result.finalTotal, 90000);
});

test('calculateDiscountedTotal with 0% discount returns original amount', () => {
  const result = calculateDiscountedTotal(50000, 0);

  assert.equal(result.discountAmount, 0);
  assert.equal(result.finalTotal, 50000);
});

test('calculateDiscountedTotal with 100% discount returns zero', () => {
  const result = calculateDiscountedTotal(50000, 100);

  assert.equal(result.discountAmount, 50000);
  assert.equal(result.finalTotal, 0);
});

test('calculateDiscountedTotal never returns negative total', () => {
  // Over-clamped discount (>100%) should still yield finalTotal >= 0
  const result = calculateDiscountedTotal(1000, 150);

  assert.ok(result.finalTotal >= 0, 'finalTotal must not be negative');
});

test('calculateDiscountedTotal with zero amount', () => {
  const result = calculateDiscountedTotal(0, 50);

  assert.equal(result.discountAmount, 0);
  assert.equal(result.finalTotal, 0);
});

// ── formatCurrency ────────────────────────────────────────────────────────────

test('formatCurrency formats COP amounts for Colombia', () => {
  assert.match(formatCurrency(15000, 'COP'), /15/);
  assert.match(formatCurrency(15000, 'COP'), /COP|\$/);
});

test('formatCurrency formats USD amounts', () => {
  const result = formatCurrency(1500, 'USD');
  assert.match(result, /1.500|1,500/);
});

test('formatCurrency handles zero', () => {
  const result = formatCurrency(0, 'COP');
  assert.match(result, /0/);
});

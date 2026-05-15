import test from 'node:test';
import assert from 'node:assert/strict';

import { isCheckoutPath } from '../src/utils/routeUtils';

// ── isCheckoutPath ────────────────────────────────────────────────────────────

test('isCheckoutPath returns true for exact /checkout', () => {
  assert.equal(isCheckoutPath('/checkout'), true);
});

test('isCheckoutPath returns true for sub-paths of /checkout', () => {
  assert.equal(isCheckoutPath('/checkout/success'), true);
  assert.equal(isCheckoutPath('/checkout/response'), true);
  assert.equal(isCheckoutPath('/checkout/payment/123'), true);
});

test('isCheckoutPath returns false for unrelated paths', () => {
  assert.equal(isCheckoutPath('/'), false);
  assert.equal(isCheckoutPath('/products'), false);
  assert.equal(isCheckoutPath('/admin'), false);
  assert.equal(isCheckoutPath('/cuenta/pedidos'), false);
});

test('isCheckoutPath returns false for paths that start with /checkout in word but are not /checkout', () => {
  // Should not match e.g. "/checkoutExtra" if implementation uses startsWith correctly
  // Our implementation only checks === "/checkout" or startsWith("/checkout/")
  assert.equal(isCheckoutPath('/checkoutExtra'), false);
});

test('isCheckoutPath returns false for null', () => {
  assert.equal(isCheckoutPath(null), false);
});

test('isCheckoutPath returns false for undefined', () => {
  assert.equal(isCheckoutPath(undefined), false);
});

test('isCheckoutPath returns false for empty string', () => {
  assert.equal(isCheckoutPath(''), false);
});

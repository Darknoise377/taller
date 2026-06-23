import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTokenInvalidError,
} from '../src/lib/meta/graphApi';

// ── isTokenInvalidError ────────────────────────────────────────────────────────

test('isTokenInvalidError identifies error code 190', () => {
  assert.equal(isTokenInvalidError(190), true);
});

test('isTokenInvalidError rejects other error codes', () => {
  assert.equal(isTokenInvalidError(400), false);
  assert.equal(isTokenInvalidError(100), false);
  assert.equal(isTokenInvalidError(190), true);
});
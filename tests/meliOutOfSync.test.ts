import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectResyncReasons, needsResync } from '../src/lib/meli/outOfSync';

describe('detectResyncReasons', () => {
  it('detects product edited after last sync', () => {
    const reasons = detectResyncReasons({
      productUpdatedAt: new Date('2026-06-02T12:00:00Z'),
      lastSyncAt: new Date('2026-06-01T12:00:00Z'),
      basePrice: 10000,
      stock: 5,
      meliItemId: 'MCO123',
      storedMeliPrice: 15000,
    });
    assert.ok(reasons.some((r) => r.includes('editó')));
    assert.equal(needsResync(reasons), true);
  });

  it('returns empty when no listing', () => {
    const reasons = detectResyncReasons({
      productUpdatedAt: new Date(),
      basePrice: 1,
      stock: 1,
    });
    assert.equal(reasons.length, 0);
  });
});

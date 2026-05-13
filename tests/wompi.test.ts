import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWompiIntegritySignature,
  mapWompiStatusToOrderStatus,
} from '../src/lib/payments/wompi';

// ── buildWompiIntegritySignature ──────────────────────────────────────────────

test('buildWompiIntegritySignature returns a deterministic sha256 hash', () => {
  const signature = buildWompiIntegritySignature({
    reference: 'ORDER-123',
    amountInCents: 150000,
    currency: 'COP',
    integritySecret: 'secret-key',
  });

  assert.equal(signature.length, 64);
  assert.match(signature, /^[a-f0-9]{64}$/i);
});

test('buildWompiIntegritySignature is deterministic for the same input', () => {
  const params = {
    reference: 'ORDER-XYZ',
    amountInCents: 99900,
    currency: 'COP',
    integritySecret: 'my-secret',
  };

  const sig1 = buildWompiIntegritySignature(params);
  const sig2 = buildWompiIntegritySignature(params);

  assert.equal(sig1, sig2);
});

test('buildWompiIntegritySignature produces different hash for different inputs', () => {
  const sig1 = buildWompiIntegritySignature({
    reference: 'ORDER-A',
    amountInCents: 10000,
    currency: 'COP',
    integritySecret: 'secret',
  });

  const sig2 = buildWompiIntegritySignature({
    reference: 'ORDER-B',
    amountInCents: 10000,
    currency: 'COP',
    integritySecret: 'secret',
  });

  assert.notEqual(sig1, sig2);
});

// ── mapWompiStatusToOrderStatus ───────────────────────────────────────────────

test('mapWompiStatusToOrderStatus maps gateway states correctly', () => {
  assert.equal(mapWompiStatusToOrderStatus('APPROVED'), 'APPROVED');
  assert.equal(mapWompiStatusToOrderStatus('DECLINED'), 'DECLINED');
  assert.equal(mapWompiStatusToOrderStatus('VOIDED'), 'DECLINED');
  assert.equal(mapWompiStatusToOrderStatus('PENDING'), 'PENDING');
});

test('mapWompiStatusToOrderStatus returns PENDING for unknown status', () => {
  assert.equal(mapWompiStatusToOrderStatus('UNKNOWN_STATE'), 'PENDING');
  assert.equal(mapWompiStatusToOrderStatus(''), 'PENDING');
});

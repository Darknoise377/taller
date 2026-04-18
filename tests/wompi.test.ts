import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWompiIntegritySignature,
  mapWompiStatusToOrderStatus,
} from '../src/lib/payments/wompi';

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

test('mapWompiStatusToOrderStatus maps gateway states correctly', () => {
  assert.equal(mapWompiStatusToOrderStatus('APPROVED'), 'APPROVED');
  assert.equal(mapWompiStatusToOrderStatus('DECLINED'), 'DECLINED');
  assert.equal(mapWompiStatusToOrderStatus('VOIDED'), 'DECLINED');
  assert.equal(mapWompiStatusToOrderStatus('PENDING'), 'PENDING');
});

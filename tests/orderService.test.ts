import test from 'node:test';
import assert from 'node:assert/strict';

import { orderService } from '../src/services/orderService';

// ── Helpers ───────────────────────────────────────────────────────────────────

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function mockFetch(responseBody: unknown, ok = true, status = 200): FetchLike {
  return async () =>
    ({
      ok,
      status,
      json: async () => responseBody,
    }) as unknown as Response;
}

const globalObj = global as unknown as Record<string, unknown>;

// ── orderService.getOrders ────────────────────────────────────────────────────

test('getOrders returns array directly', async () => {
  const sample = [{ id: 1, status: 'PENDING' }];
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch(sample);
  try {
    const result = await orderService.getOrders();
    assert.deepEqual(result, sample);
  } finally {
    globalObj.fetch = original;
  }
});

test('getOrders unwraps paginated { items } response', async () => {
  const sample = [{ id: 2, status: 'SHIPPED' }];
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch({ items: sample, total: 1 });
  try {
    const result = await orderService.getOrders();
    assert.deepEqual(result, sample);
  } finally {
    globalObj.fetch = original;
  }
});

test('getOrders throws on non-ok response', async () => {
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch({ error: 'Unauthorized' }, false, 401);
  try {
    await assert.rejects(
      () => orderService.getOrders(),
      /Error al obtener/
    );
  } finally {
    globalObj.fetch = original;
  }
});

// ── orderService.getOrder ─────────────────────────────────────────────────────

test('getOrder returns order by id', async () => {
  const sample = { id: 42, status: 'DELIVERED' };
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch(sample);
  try {
    const result = await orderService.getOrder(42);
    assert.deepEqual(result, sample);
  } finally {
    globalObj.fetch = original;
  }
});

test('getOrder throws on non-ok response', async () => {
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch({ error: 'Not found' }, false, 404);
  try {
    await assert.rejects(
      () => orderService.getOrder(99),
      /Error al obtener la orden con ID 99/
    );
  } finally {
    globalObj.fetch = original;
  }
});

// ── orderService.deleteOrder ──────────────────────────────────────────────────

test('deleteOrder resolves without error on success', async () => {
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch(null);
  try {
    await assert.doesNotReject(() => orderService.deleteOrder(1));
  } finally {
    globalObj.fetch = original;
  }
});

test('deleteOrder throws on non-ok response', async () => {
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch({ error: 'Forbidden' }, false, 403);
  try {
    await assert.rejects(
      () => orderService.deleteOrder(1),
      /Error al eliminar la orden 1/
    );
  } finally {
    globalObj.fetch = original;
  }
});

// ── orderService.createOrder ──────────────────────────────────────────────────

test('createOrder trims customerEmail and returns order', async () => {
  const created = { id: 10, status: 'PENDING' };
  const original = globalObj.fetch;
  let capturedBody: Record<string, unknown> = {};
  globalObj.fetch = async (_url: unknown, init?: RequestInit) => {
    capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
    return { ok: true, json: async () => created } as unknown as Response;
  };
  try {
    const result = await orderService.createOrder({
      customerEmail: '  test@example.com  ',
      customerName: 'Test',
      total: 10000,
      products: [{ productId: '1', quantity: 2 }],
      paymentMethod: 'CASH',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    assert.equal(capturedBody.customerEmail, 'test@example.com');
    assert.deepEqual(result, created);
  } finally {
    globalObj.fetch = original;
  }
});

test('createOrder throws with server error message', async () => {
  const original = globalObj.fetch;
  globalObj.fetch = mockFetch({ message: 'Stock insuficiente' }, false, 422);
  try {
    await assert.rejects(
      () =>
        orderService.createOrder({
          customerEmail: 'x@x.com',
          customerName: 'X',
          total: 5000,
          products: [{ productId: '1', quantity: 1 }],
          paymentMethod: 'CASH',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      /Stock insuficiente/
    );
  } finally {
    globalObj.fetch = original;
  }
});

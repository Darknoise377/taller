import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OrderStatus } from '@prisma/client';
import {
  shouldReleaseStockForStatus,
  STOCK_RELEASE_STATUSES,
} from '../src/lib/orders/restoreStock';
import { getPendingWompiExpireHours } from '../src/lib/orders/expirePendingOrders';

describe('shouldReleaseStockForStatus', () => {
  it('releases on DECLINED and CANCELLED only', () => {
    assert.equal(shouldReleaseStockForStatus(OrderStatus.DECLINED), true);
    assert.equal(shouldReleaseStockForStatus(OrderStatus.CANCELLED), true);
    assert.equal(shouldReleaseStockForStatus(OrderStatus.PENDING), false);
    assert.equal(shouldReleaseStockForStatus(OrderStatus.APPROVED), false);
    assert.equal(shouldReleaseStockForStatus(OrderStatus.SHIPPED), false);
  });

  it('STOCK_RELEASE_STATUSES matches helper', () => {
    for (const status of STOCK_RELEASE_STATUSES) {
      assert.equal(shouldReleaseStockForStatus(status), true);
    }
  });
});

describe('getPendingWompiExpireHours', () => {
  it('defaults to 48 when env is missing', () => {
    const prev = process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS;
    delete process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS;
    assert.equal(getPendingWompiExpireHours(), 48);
    if (prev !== undefined) process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS = prev;
  });

  it('parses valid env value', () => {
    const prev = process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS;
    process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS = '24';
    assert.equal(getPendingWompiExpireHours(), 24);
    if (prev !== undefined) process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS = prev;
    else delete process.env.PENDING_WOMPI_ORDER_EXPIRE_HOURS;
  });
});

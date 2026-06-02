import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MeliListingStatus } from '@prisma/client';
import {
  describeSubStatuses,
  getSyncState,
  mapApiStatusToDb,
  matchesSyncFilter,
  parseMeliLiveStatus,
} from '../src/lib/meli/listingStatus';

describe('mapApiStatusToDb', () => {
  it('maps MeLi API statuses to Prisma enum', () => {
    assert.equal(mapApiStatusToDb('active'), MeliListingStatus.ACTIVE);
    assert.equal(mapApiStatusToDb('paused'), MeliListingStatus.PAUSED);
    assert.equal(mapApiStatusToDb('closed'), MeliListingStatus.CLOSED);
  });
});

describe('parseMeliLiveStatus', () => {
  it('explains pause with sub_status', () => {
    const parsed = parseMeliLiveStatus({
      id: 'MCO123',
      title: 'Test',
      price: 10000,
      available_quantity: 0,
      status: 'paused',
      sub_status: ['out_of_stock'],
      tags: [],
    });
    assert.ok(parsed?.isPaused);
    assert.match(parsed?.pauseReason ?? '', /Sin stock/i);
  });

  it('flags moderation tag', () => {
    const reason = describeSubStatuses([], ['moderation_penalty']);
    assert.match(reason ?? '', /moderación/i);
  });
});

describe('getSyncState', () => {
  it('pending when export enabled but no item id', () => {
    assert.equal(
      getSyncState({ meliExport: true, meliItemId: undefined }),
      'pending',
    );
  });

  it('issues when live health is warning', () => {
    assert.equal(
      getSyncState({
        meliExport: true,
        meliItemId: 'MCO1',
        localStatus: 'ACTIVE',
        live: {
          liveStatus: 'paused',
          subStatuses: [],
          tags: [],
          dbStatus: MeliListingStatus.PAUSED,
          health: 'warning',
          isPaused: true,
          isActive: false,
          pauseReason: 'test',
          statusLabel: 'Pausada',
          statusDetail: 'test',
          permalink: null,
          availableQuantity: 0,
          livePrice: 1,
        },
      }),
      'issues',
    );
  });
});

describe('matchesSyncFilter', () => {
  it('filters by sync state', () => {
    assert.equal(matchesSyncFilter('pending', 'pending'), true);
    assert.equal(matchesSyncFilter('synced', 'pending'), false);
  });
});

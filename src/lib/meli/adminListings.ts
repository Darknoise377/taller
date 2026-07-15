import { prisma } from '@/lib/prisma';
import { meliApi, type MeliVisitsEntry } from './client';
import { parseMeliLiveStatus, getSyncState, type MeliSyncFilter } from './listingStatus';
import { calculateMeliPriceSync, getMeliConfig } from './pricing';
import { detectResyncReasons, needsResync } from './outOfSync';

export type AdminMeliListingRow = {
  productId: string;
  productName: string;
  basePrice: number;
  meliPrice: number;
  meliItemId?: string;
  meliPermalink?: string | null;
  localStatus?: string;
  lastSyncAt?: string;
  meliExport: boolean;
  stock: number;
  live: ReturnType<typeof parseMeliLiveStatus>;
  syncState: 'synced' | 'pending' | 'issues' | 'out_of_sync';
  resyncReasons: string[];
  meliVisitsTotal?: number | null;
  meliVisitsCheckedAt?: string | null;
};

function visitsDateRange(days = 30): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function fetchLiveItemsMap(meliItemIds: string[]) {
  const map = new Map<string, ReturnType<typeof parseMeliLiveStatus>>();

  for (let i = 0; i < meliItemIds.length; i += 20) {
    const chunk = meliItemIds.slice(i, i + 20);
    try {
      const entries = await meliApi.getItemsByIds(chunk);
      for (const entry of entries) {
        if (entry.code !== 200 || !entry.body) continue;
        map.set(entry.body.id, parseMeliLiveStatus(entry.body));
      }
    } catch (err) {
      console.warn('[meli/adminListings] multiget batch failed:', err);
    }
    if (i + 20 < meliItemIds.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return map;
}

async function fetchVisitsMap(meliItemIds: string[]) {
  const map = new Map<string, number>();
  if (meliItemIds.length === 0) return map;

  const { from, to } = visitsDateRange(30);

  // MeLi Colombia (MCO) visits endpoint only accepts 1 item per request
  for (let i = 0; i < meliItemIds.length; i++) {
    const itemId = meliItemIds[i];
    try {
      const entries = await meliApi.getItemsVisits([itemId], from, to);
      const list = Array.isArray(entries) ? entries : [];
      for (const row of list as MeliVisitsEntry[]) {
        if (row?.item_id && typeof row.total_visits === 'number') {
          map.set(row.item_id, row.total_visits);
        }
      }
    } catch (err) {
      console.warn(`[meli/adminListings] visits failed for ${itemId}:`, err);
    }
    // Throttle: avoid rate-limiting (MeLi allows ~10 req/s on free tier)
    if (i + 1 < meliItemIds.length) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  return map;
}

export type AdminMeliListingsSummary = {
  total: number;
  synced: number;
  pending: number;
  issues: number;
  outOfSync: number;
};

export function summarizeListings(items: AdminMeliListingRow[]): AdminMeliListingsSummary {
  return {
    total: items.length,
    synced: items.filter((i) => i.syncState === 'synced').length,
    pending: items.filter((i) => i.syncState === 'pending').length,
    issues: items.filter((i) => i.syncState === 'issues').length,
    outOfSync: items.filter((i) => i.syncState === 'out_of_sync').length,
  };
}

export function filterBySyncState(
  items: AdminMeliListingRow[],
  filter: MeliSyncFilter,
): AdminMeliListingRow[] {
  if (filter === 'all') return items;
  if (filter === 'synced') {
    return items.filter((row) => Boolean(row.meliItemId) && row.syncState === 'synced');
  }
  return items.filter((row) => row.syncState === filter);
}

/**
 * Loads catalog rows for admin MeLi page and optionally refreshes live status from MeLi API.
 */
export async function loadAdminMeliListings(options: {
  refreshLive?: boolean;
}): Promise<AdminMeliListingRow[]> {
const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      updatedAt: true,
      meliExport: true,
      meliListingType: true,
      meliListing: {
        select: {
          meliItemId: true,
          status: true,
          meliPrice: true,
          lastSyncAt: true,
          syncedProductPrice: true,
          syncedProductStock: true,
          meliVisitsTotal: true,
          meliVisitsCheckedAt: true,
          meliPermalink: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const meliItemIds = products
    .map((p) => p.meliListing?.meliItemId)
    .filter((id): id is string => Boolean(id));

  let liveMap = new Map<string, ReturnType<typeof parseMeliLiveStatus>>();
  let visitsMap = new Map<string, number>();

  if (options.refreshLive && meliItemIds.length > 0) {
    [liveMap, visitsMap] = await Promise.all([
      fetchLiveItemsMap(meliItemIds),
      fetchVisitsMap(meliItemIds),
    ]);

    const checkedAt = new Date();

    await Promise.all(
      products.map(async (p) => {
        const itemId = p.meliListing?.meliItemId;
        if (!itemId || !p.meliListing) return;

        const live = liveMap.get(itemId);
        const visits = visitsMap.get(itemId);

        await prisma.meliListing.update({
          where: { productId: p.id },
          data: {
            ...(live ? { status: live.dbStatus } : {}),
            ...(visits !== undefined
              ? { meliVisitsTotal: visits, meliVisitsCheckedAt: checkedAt }
              : {}),
          },
        });
      }),
    );
  }

  const meliConfig = await getMeliConfig();
  const rows: AdminMeliListingRow[] = [];

  for (const p of products) {
    const meliItemId = p.meliListing?.meliItemId;
    const live = meliItemId && liveMap.size > 0 ? liveMap.get(meliItemId) ?? null : null;
    const localStatus = p.meliListing?.status;

    let expectedMeliPrice: number | undefined;
    if (p.meliListing) {
      try {
        expectedMeliPrice = calculateMeliPriceSync(
          p.price,
          p.meliListingType || meliConfig.defaultListingType,
          meliConfig.extraMarginPercent,
          meliConfig.fixedCostCOP,
        ).meliPrice;
      } catch {
        expectedMeliPrice = undefined;
      }
    }

    const resyncReasons = detectResyncReasons({
      productUpdatedAt: p.updatedAt,
      lastSyncAt: p.meliListing?.lastSyncAt,
      basePrice: p.price,
      stock: p.stock,
      meliItemId,
      storedMeliPrice: p.meliListing?.meliPrice,
      expectedMeliPrice,
      syncedProductPrice: p.meliListing?.syncedProductPrice,
      syncedProductStock: p.meliListing?.syncedProductStock,
      livePrice: live?.livePrice,
      liveStock: live?.availableQuantity,
    });

    let syncState = getSyncState({
      meliExport: p.meliExport,
      meliItemId,
      localStatus,
      live,
    });

    if (meliItemId && needsResync(resyncReasons) && syncState === 'synced') {
      syncState = 'out_of_sync';
    } else if (meliItemId && needsResync(resyncReasons) && syncState === 'issues') {
      // keep issues but reasons will show both
    } else if (meliItemId && needsResync(resyncReasons)) {
      syncState = 'out_of_sync';
    }

    const visitsFromRefresh =
      meliItemId && visitsMap.has(meliItemId) ? visitsMap.get(meliItemId)! : undefined;

    rows.push({
      productId: p.id,
      productName: p.name,
      basePrice: p.price,
      meliPrice: p.meliListing?.meliPrice ?? 0,
      meliItemId,
      meliPermalink: p.meliListing?.meliPermalink ?? null,
      localStatus,
      lastSyncAt: p.meliListing?.lastSyncAt?.toISOString(),
      meliExport: p.meliExport,
      stock: p.stock,
      live,
      syncState,
      resyncReasons,
      meliVisitsTotal:
        visitsFromRefresh ?? p.meliListing?.meliVisitsTotal ?? null,
      meliVisitsCheckedAt:
        visitsFromRefresh !== undefined
          ? new Date().toISOString()
          : p.meliListing?.meliVisitsCheckedAt?.toISOString() ?? null,
    });
  }

  return rows;
}

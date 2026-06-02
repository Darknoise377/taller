import { prisma } from '@/lib/prisma';
import { meliApi } from './client';
import { parseMeliLiveStatus } from './listingStatus';

export type AdminMeliListingRow = {
  productId: string;
  productName: string;
  basePrice: number;
  meliPrice: number;
  meliItemId?: string;
  localStatus?: string;
  lastSyncAt?: string;
  meliExport: boolean;
  stock: number;
  live: ReturnType<typeof parseMeliLiveStatus>;
  syncState: 'synced' | 'pending' | 'issues';
};

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
      meliExport: true,
      meliListing: {
        select: {
          meliItemId: true,
          status: true,
          meliPrice: true,
          lastSyncAt: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const meliItemIds = products
    .map((p) => p.meliListing?.meliItemId)
    .filter((id): id is string => Boolean(id));

  let liveMap = new Map<string, ReturnType<typeof parseMeliLiveStatus>>();

  if (options.refreshLive && meliItemIds.length > 0) {
    liveMap = await fetchLiveItemsMap(meliItemIds);

    await Promise.all(
      products.map(async (p) => {
        const itemId = p.meliListing?.meliItemId;
        if (!itemId) return;
        const live = liveMap.get(itemId);
        if (!live) return;
        await prisma.meliListing.update({
          where: { productId: p.id },
          data: { status: live.dbStatus },
        });
      }),
    );
  }

  const { getSyncState } = await import('./listingStatus');

  return products.map((p) => {
    const meliItemId = p.meliListing?.meliItemId;
    const live = meliItemId && liveMap.size > 0 ? liveMap.get(meliItemId) ?? null : null;
    const localStatus = p.meliListing?.status;

    const syncState = getSyncState({
      meliExport: p.meliExport,
      meliItemId,
      localStatus,
      live,
    });

    return {
      productId: p.id,
      productName: p.name,
      basePrice: p.price,
      meliPrice: p.meliListing?.meliPrice ?? 0,
      meliItemId,
      localStatus,
      lastSyncAt: p.meliListing?.lastSyncAt?.toISOString(),
      meliExport: p.meliExport,
      stock: p.stock,
      live,
      syncState,
    };
  });
}

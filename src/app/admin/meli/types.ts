export interface MeliStatus {
  connected: boolean;
  nickname?: string;
  email?: string;
  expiresAt?: string;
}

export interface MeliConfig {
  id: number;
  extraMarginPercent: number;
  fixedCostCOP: number;
  defaultListingType: string;
  freeInstallments: number;
  categoryMap: Record<string, string>;
}

export interface ListingRow {
  productId: string;
  productName: string;
  basePrice: number;
  meliPrice: number;
  meliItemId?: string;
  localStatus?: string;
  lastSyncAt?: string;
  meliExport: boolean;
  stock: number;
  syncState: 'synced' | 'pending' | 'issues' | 'out_of_sync';
  resyncReasons: string[];
  meliVisitsTotal?: number | null;
  meliVisitsCheckedAt?: string | null;
  meliCategoryId?: string | null;
  meliCategoryName?: string | null;
  meliCategoryPath?: string | null;
  live?: {
    statusLabel: string;
    statusDetail: string | null;
    pauseReason: string | null;
    isPaused: boolean;
    isActive: boolean;
    health: 'ok' | 'warning' | 'error' | 'unknown';
    permalink: string | null;
    availableQuantity: number | null;
    livePrice: number | null;
    liveStatus: string;
  } | null;
}

export interface ListingsSummary {
  total: number;
  synced: number;
  pending: number;
  issues: number;
  outOfSync: number;
}

export interface MeliOrderRow {
  meliOrderId: string;
  status: string;
  rawPayload?: {
    total_amount?: number;
    date_created?: string;
    buyer?: {
      nickname?: string;
      email?: string;
    };
    order_items?: Array<{
      quantity?: number;
      item?: {
        title?: string;
      };
    }>;
  } | null;
  createdAt: string | Date;
}

export type MeliTab = 'products' | 'sales' | 'net';

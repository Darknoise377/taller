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
  meliShippingCostCOP?: number;
  freeShippingThresholdCOP?: number;
  categoryMap: Record<string, string>;
}

export interface CategoryAuditInfo {
  status: 'correct' | 'warning' | 'mismatch' | 'unassigned';
  label: string;
  reason: string;
  isMotoDomain: boolean;
  needsCorrection: boolean;
}

export interface ListingRow {
  productId: string;
  productName: string;
  productCategory?: string;
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
  categoryAudit?: CategoryAuditInfo;
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
  categoryIssues?: number;
}

export interface MeliOrderBuyer {
  id?: number;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: {
    area_code?: string;
    number?: string;
  } | string;
  billing_info?: {
    doc_type?: string;
    doc_number?: string;
  };
}

export interface MeliOrderReceiverAddress {
  receiver_name?: string;
  receiver_phone?: string;
  street_name?: string;
  street_number?: string;
  comment?: string;
  city?: { name: string } | string;
  state?: { name: string } | string;
  zip_code?: string;
}

export interface MeliOrderItem {
  quantity?: number;
  unit_price?: number;
  full_unit_price?: number;
  sale_fee?: number;
  listing_type_id?: string;
  item?: {
    id?: string;
    title?: string;
    category_id?: string;
    thumbnail?: string;
    permalink?: string;
  };
}

export interface MeliOrderRow {
  meliOrderId: string;
  status: string;
  basePrice: number;
  rawPayload?: {
    total_amount?: number;
    date_created?: string;
    date_closed?: string;
    shipping_cost?: number;
    buyer?: MeliOrderBuyer;
    shipping?: {
      id?: number | string;
      status?: string;
      substatus?: string;
      shipping_mode?: string;
      receiver_address?: MeliOrderReceiverAddress;
      tracking_number?: string;
      logistic_type?: string;
    };
    payments?: Array<{
      id?: number;
      status?: string;
      payment_method_id?: string;
      payment_type?: string;
      installments?: number;
      marketplace_fee?: number;
      shipping_cost?: number;
      transaction_amount?: number;
      date_approved?: string;
    }>;
    order_items?: MeliOrderItem[];
  } | null;
  createdAt: string | Date;
  realCommission?: number | null;
  realShippingCost?: number | null;
  shipmentId?: string | null;
  shippingAddress?: MeliOrderReceiverAddress | null;
  shippingStatus?: string | null;
  trackingNumber?: string | null;
  shippingLabelUrl?: string | null;
}

export type MeliTab = 'products' | 'combos' | 'sales' | 'net' | 'config';

// src/app/admin/combos/types.ts

export interface AdminComboItemProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  images?: string[];
  stock: number;
  category?: string;
  sku?: string | null;
}

export interface AdminComboItem {
  id?: number;
  productId: string;
  quantity: number;
  product?: AdminComboItemProduct;
}

export interface AdminSurpriseGift {
  id?: number;
  hint?: string | null;
  giftName: string;
  giftValue?: number | null;
}

export interface AdminCombo {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  currency: string;
  imageUrl?: string | null;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  stock: number;
  soldCount: number;
  badge?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  meliExport?: boolean;
  meliTitle?: string | null;
  meliListingType?: string;
  meliListing?: {
    id?: number;
    meliItemId: string;
    meliPermalink?: string | null;
    status: string;
    meliPrice: number;
    lastSyncAt?: string;
  } | null;
  savings?: number;
  savingsPercent?: number;
  items: AdminComboItem[];
  surpriseGift?: AdminSurpriseGift | null;
  _count?: {
    orderCombos: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductOption {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  category?: string;
  sku?: string | null;
}

export type FilterStatus =
  | 'all'
  | 'active'
  | 'inactive'
  | 'featured'
  | 'expired'
  | 'gift'
  | 'low_stock';

export type SortOption =
  | 'recent'
  | 'sales'
  | 'discount'
  | 'price_asc'
  | 'price_desc'
  | 'stock_asc';

export type ViewMode = 'grid' | 'table';

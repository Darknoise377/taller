// src/types/combo.d.ts

export interface ComboProductItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  images?: string[];
  category: string;
  stock: number;
  sku?: string | null;
}

export interface ComboItem {
  id: number;
  productId: string;
  quantity: number;
  product: ComboProductItem;
}

export interface SurpriseGift {
  id: number;
  hint?: string | null;
  /** Only populated after purchase — never sent to the browser before checkout */
  giftName?: string;
  giftValue?: number | null;
}

export interface Combo {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  currency: string;
  imageUrl?: string | null;
  images?: string[];
  isActive: boolean;
  isFeatured: boolean;
  stock: number;
  soldCount: number;
  badge?: string | null;
  expiresAt?: string | null; // ISO string
  items: ComboItem[];
  surpriseGift?: Omit<SurpriseGift, 'giftName'> | null; // giftName is hidden
  createdAt: string;
  updatedAt: string;
  /** Computed: discount percentage shown on the card */
  savingsPercent?: number;
}

/** Cart item for a combo */
export interface ComboCartItem {
  combo: Combo;
  quantity: number;
}

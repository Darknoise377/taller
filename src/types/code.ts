export type DiscountMode = 'REAL' | 'ANCHOR' | 'FIXED_PRICE';

export interface SellerCode {
  id: string;
  name: string;
  code: string;
}

export type PromotionAppliesTo = 'ALL' | 'CATEGORY' | 'PRODUCT';

export interface PromotionCode {
  id: string;
  code: string;
  description: string;
  discount: number;
  isActive?: boolean;
  expiresAt?: string | Date | null;
  appliesTo?: PromotionAppliesTo;
  targetCategories?: string[];
  targetProductIds?: string[];
  mode?: DiscountMode;
  targetPrice?: number | null;
}

export type DiscountMode = 'REAL' | 'ANCHOR' | 'FIXED_PRICE';

export interface FlashSale {
  id: string;
  name: string;
  description: string | null;
  discount: number;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  appliesTo: string;
  targetCategories: string[];
  targetProductIds: string[];
  mode: DiscountMode;
  targetPrice: number | null;
}
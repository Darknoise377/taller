export interface SellerCode {
  id: string;
  name: string;
  code: string;
}

export interface PromotionCode {
  id: string;
  code: string;
  description: string;
  discount: number;
  isActive?: boolean;
  expiresAt?: string | Date | null;
}

// en src/utils/formatCurrency.ts
export const normalizeAmount = (amount: number): number => {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, normalizeAmount(value)));
};

export const calculateDiscountedTotal = (
  amount: number,
  discountPercentage: number
): { discountAmount: number; finalTotal: number } => {
  const safeAmount = normalizeAmount(amount);
  const safeDiscount = clampPercentage(discountPercentage);
  const discountAmount = normalizeAmount(safeAmount * (safeDiscount / 100));
  const finalTotal = normalizeAmount(Math.max(0, safeAmount - discountAmount));

  return { discountAmount, finalTotal };
};

export const formatCurrency = (
  amount: number,
  currency: 'USD' | 'EUR' | 'COP' = 'COP'
): string => {
  const isCop = currency === 'COP';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: isCop ? 0 : 2,
    maximumFractionDigits: isCop ? 0 : 2,
  }).format(normalizeAmount(amount));
};
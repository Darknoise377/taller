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

export const formatCurrencyStrikethrough = (
  amount: number,
  currency: 'USD' | 'EUR' | 'COP' = 'COP'
): string => {
  const rounded = Math.ceil(amount / 100) * 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
};

// Discount modes
export type DiscountMode = 'REAL' | 'ANCHOR' | 'FIXED_PRICE';

interface CalculateDisplayPricesInput {
  basePrice: number;
  discountPercentage: number;
  mode: DiscountMode;
  targetPrice?: number | null;
}

interface CalculateDisplayPricesResult {
  displayPrice: number;
  originalPrice: number | null;
  discountPercentage: number;
}

// Calcula precios según modo de descuento
export function calculateDisplayPrices({
  basePrice,
  discountPercentage,
  mode,
  targetPrice,
}: CalculateDisplayPricesInput): CalculateDisplayPricesResult {
  const safeDiscount = Math.min(99, Math.max(0, discountPercentage));
  const factor = 1 - safeDiscount / 100;

  switch (mode) {
    case 'REAL':
      // Descuento real: el precio base es el original, el final es el reducido
      return {
        displayPrice: Math.ceil(basePrice * factor),
        originalPrice: basePrice,
        discountPercentage: safeDiscount,
      };

    case 'ANCHOR':
      // Anclaje: el precio actual es el real, se muestra tachado inflado
      if (factor <= 0) return { displayPrice: basePrice, originalPrice: basePrice, discountPercentage: 0 };
      return {
        displayPrice: basePrice,
        originalPrice: Math.ceil(basePrice / factor),
        discountPercentage: safeDiscount,
      };

    case 'FIXED_PRICE':
      // Precio fijo: el precio final es el targetPrice
      if (targetPrice == null || !Number.isFinite(targetPrice)) {
        return { displayPrice: basePrice, originalPrice: null, discountPercentage: 0 };
      }
      return {
        displayPrice: targetPrice,
        originalPrice: factor > 0 ? Math.ceil(targetPrice / factor) : targetPrice,
        discountPercentage: safeDiscount,
      };

    default:
      return { displayPrice: basePrice, originalPrice: null, discountPercentage: 0 };
  }
}
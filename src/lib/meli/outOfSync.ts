/**
 * Detects when local catalog data diverges from what was last pushed to MeLi.
 */
export type OutOfSyncCheck = {
  productUpdatedAt: Date;
  lastSyncAt?: Date | null;
  basePrice: number;
  stock: number;
  meliItemId?: string;
  storedMeliPrice?: number;
  expectedMeliPrice?: number;
  syncedProductPrice?: number | null;
  syncedProductStock?: number | null;
  livePrice?: number | null;
  liveStock?: number | null;
};

export function detectResyncReasons(input: OutOfSyncCheck): string[] {
  if (!input.meliItemId || !input.lastSyncAt) return [];

  const reasons: string[] = [];

  if (input.productUpdatedAt.getTime() > input.lastSyncAt.getTime()) {
    reasons.push('El producto se editó en la tienda después de la última sync');
  }

  if (
    input.syncedProductPrice != null &&
    Math.round(input.syncedProductPrice) !== Math.round(input.basePrice)
  ) {
    reasons.push('El precio base cambió desde la última sync a MeLi');
  }

  if (
    input.syncedProductStock != null &&
    input.syncedProductStock !== input.stock
  ) {
    reasons.push('El stock local cambió desde la última sync a MeLi');
  }

  if (
    input.expectedMeliPrice != null &&
    input.storedMeliPrice != null &&
    Math.abs(input.expectedMeliPrice - input.storedMeliPrice) >= 100
  ) {
    reasons.push('La configuración de precios MeLi genera un valor distinto al publicado');
  }

  if (
    input.liveStock != null &&
    input.liveStock !== input.stock
  ) {
    reasons.push(`Stock en MeLi (${input.liveStock}) ≠ stock local (${input.stock})`);
  }

  if (
    input.livePrice != null &&
    input.storedMeliPrice != null &&
    Math.abs(input.livePrice - input.storedMeliPrice) >= 100
  ) {
    reasons.push('El precio en MeLi no coincide con el registrado aquí');
  }

  return [...new Set(reasons)];
}

export function needsResync(reasons: string[]): boolean {
  return reasons.length > 0;
}

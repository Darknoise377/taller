/**
 * Synchronise products from our DB → Mercado Libre.
 *
 * - publishProduct: First-time publish (POST /items).
 * - syncProduct:    Smart upsert — publishes if not listed, updates if already listed.
 * - updateStockAndPrice: Called after a local sale to keep MeLi in sync.
 * - unpublishProduct: Close the listing on MeLi.
 */
import { prisma } from '@/lib/prisma';
import { meliApi, type MeliItemPayload } from './client';
import { calculateMeliPrice, getMeliConfig } from './pricing';
import type { Product } from '@prisma/client';

// ─── Build a MeLi item payload from a local product ─────────────────────────
async function buildPayload(
  product: Product,
  categoryId: string,
): Promise<MeliItemPayload> {
  const listingType = product.meliListingType || 'gold_special';
  const { meliPrice } = await calculateMeliPrice(product.price, listingType);

  const pictures =
    product.images?.length
      ? product.images.map((url) => ({ source: url }))
      : product.imageUrl
      ? [{ source: product.imageUrl }]
      : [];

  return {
    title: product.name,
    category_id: categoryId,
    price: meliPrice,
    currency_id: 'COP',
    available_quantity: product.stock,
    buying_mode: 'buy_it_now',
    condition: 'new',
    listing_type_id: listingType,
    description: { plain_text: product.description },
    pictures,
    shipping: {
      mode: 'me2',      // Mercado Envíos
      local_pick_up: true,
      free_shipping: false,
    },
  };
}

// ─── Resolve MeLi category_id for a local product ───────────────────────────
async function resolveCategoryId(product: Product): Promise<string> {
  const { categoryMap } = await getMeliConfig();
  const localCat = String(product.category).toLowerCase();

  if (categoryMap[localCat]) return categoryMap[localCat];

  // Auto-predict via MeLi API (best-effort)
  try {
    const predictions = await meliApi.predictCategory(product.name);
    if (predictions.length > 0) return predictions[0].category_id;
  } catch {
    // ignore — caller must configure category map
  }

  throw new Error(
    `No MeLi category mapped for "${localCat}". Configure it in the MeLi settings.`,
  );
}

// ─── Publish a product for the first time ─────────────────────────────────────
export async function publishProduct(productId: string): Promise<{ meliItemId: string }> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const categoryId = await resolveCategoryId(product);
  const payload = await buildPayload(product, categoryId);
  const { meliPrice } = await calculateMeliPrice(product.price);

  const response = await meliApi.createItem(payload);

  await prisma.meliListing.create({
    data: {
      productId,
      meliItemId: response.id,
      status: 'ACTIVE',
      meliPrice,
    },
  });

  return { meliItemId: response.id };
}

// ─── Update price & stock on an existing listing ─────────────────────────────
export async function updateStockAndPrice(productId: string): Promise<void> {
  const [product, listing] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: productId } }),
    prisma.meliListing.findUnique({ where: { productId } }),
  ]);

  if (!listing) return; // Not published yet — nothing to update.

  const { meliPrice } = await calculateMeliPrice(product.price);

  await meliApi.updateItem(listing.meliItemId, {
    price: meliPrice,
    available_quantity: product.stock,
  });

  await prisma.meliListing.update({
    where: { productId },
    data: { meliPrice, lastSyncAt: new Date() },
  });
}

// ─── Smart upsert ─────────────────────────────────────────────────────────────
export async function syncProduct(productId: string): Promise<{ action: 'published' | 'updated' }> {
  const listing = await prisma.meliListing.findUnique({ where: { productId } });

  if (!listing) {
    await publishProduct(productId);
    return { action: 'published' };
  }

  await updateStockAndPrice(productId);
  return { action: 'updated' };
}

// ─── Bulk sync all products with meliExport = true ───────────────────────────
export async function bulkSyncProducts(): Promise<{
  synced: number;
  errors: { productId: string; error: string }[];
}> {
  const products = await prisma.product.findMany({
    where: { meliExport: true, stock: { gt: 0 } },
    select: { id: true },
  });

  let synced = 0;
  const errors: { productId: string; error: string }[] = [];

  for (const { id } of products) {
    try {
      await syncProduct(id);
      synced++;
    } catch (err) {
      errors.push({ productId: id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { synced, errors };
}

// ─── Close listing on MeLi ───────────────────────────────────────────────────
export async function unpublishProduct(productId: string): Promise<void> {
  const listing = await prisma.meliListing.findUnique({ where: { productId } });
  if (!listing) return;

  await meliApi.closeItem(listing.meliItemId);

  await prisma.meliListing.update({
    where: { productId },
    data: { status: 'CLOSED', lastSyncAt: new Date() },
  });
}

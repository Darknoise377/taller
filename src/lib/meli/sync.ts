/**
 * Synchronise products from our DB → Mercado Libre.
 *
 * - publishProduct: First-time publish (POST /items).
 * - syncProduct:    Smart upsert — publishes if not listed, updates if already listed.
 * - updateStockAndPrice: Called after a local sale to keep MeLi in sync.
 * - unpublishProduct: Close the listing on MeLi.
 */
import { prisma } from '@/lib/prisma';
import { meliApi, type MeliItemPayload, type MeliCategoryAttribute } from './client';
import { mapApiStatusToDb } from './listingStatus';
import { calculateMeliPrice, getMeliConfig } from './pricing';
import type { Product } from '@prisma/client';

// Known attribute IDs that we can map from local product fields.
const SELLER_SKU  = 'SELLER_SKU';
const BRAND       = 'BRAND';
const PART_NUMBER = 'PART_NUMBER';

type UnresolvedAttr = Pick<MeliCategoryAttribute, 'id' | 'name' | 'value_type' | 'values'>;

/**
 * Uses AI to infer values for required MeLi attributes that couldn't be resolved
 * from product fields alone. For list-type attrs the AI picks from allowed values.
 */
async function resolveAttributesWithAI(
  product: Product,
  unresolved: UnresolvedAttr[],
): Promise<{ id: string; value_name: string }[]> {
  if (unresolved.length === 0) return [];

  const productBrand = (product as Product & { brand?: string | null }).brand;
  const context = [
    `Producto: ${product.name}`,
    productBrand ? `Marca: ${productBrand}` : null,
    product.sku ? `SKU: ${product.sku}` : null,
    product.tags?.length ? `Etiquetas: ${product.tags.join(', ')}` : null,
    product.description ? `Descripción: ${product.description.slice(0, 200)}` : null,
  ].filter(Boolean).join('\n');

  const attrsDesc = unresolved.map((a) => {
    if (a.values && a.values.length > 0) {
      return `- ${a.name} (ID: ${a.id}): elige EXACTAMENTE uno de: ${a.values.map((v) => `"${v.name}"`).join(', ')}`;
    }
    return `- ${a.name} (ID: ${a.id}): texto libre, máximo 60 caracteres`;
  }).join('\n');

  const prompt = `Eres un experto en repuestos de motos para Colombia y Mercado Libre.\nDado este producto, asigna el valor más apropiado para cada atributo requerido.\n\n${context}\n\nAtributos a completar:\n${attrsDesc}\n\nResponde únicamente con un JSON con este formato (sin texto adicional):\n{"attributes":[{"id":"ATTR_ID","value_name":"valor"}]}`;

  try {
    const { generateText } = await import('ai');
    const { getAIModel } = await import('@/lib/ai-provider');
    const { text } = await generateText({ model: getAIModel(), prompt });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as { attributes?: { id: string; value_name: string }[] };
    return parsed.attributes ?? [];
  } catch (err) {
    console.warn('[meli/sync] AI attribute fallback failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Fetch required attributes for a MeLi category and map what we can from the product.
 * Any attribute that cannot be resolved from product fields is sent to the AI for inference.
 */
async function buildAttributes(
  product: Product,
  categoryId: string,
): Promise<{ id: string; value_name: string }[]> {
  let categoryAttrs;
  try {
    categoryAttrs = await meliApi.getCategoryAttributes(categoryId);
  } catch {
    return []; // Non-fatal: proceed without attributes if the call fails
  }

  const required = categoryAttrs.filter((a) => a.tags.required && !a.tags.hidden && !a.tags.read_only);
  const result: { id: string; value_name: string }[] = [];
  const unresolved: UnresolvedAttr[] = [];

  for (const attr of required) {
    if (attr.id === SELLER_SKU && product.sku) {
      result.push({ id: SELLER_SKU, value_name: product.sku });
    } else if (attr.id === BRAND) {
      const brand =
        (product as Product & { brand?: string | null }).brand ||
        product.tags?.[0] ||
        'Genérico';
      result.push({ id: BRAND, value_name: brand });
    } else if (attr.id === PART_NUMBER) {
      const partNumber =
        product.sku ||
        product.diagramNumber ||
        product.name.slice(0, 40);
      result.push({ id: PART_NUMBER, value_name: partNumber });
    } else if (attr.id === 'MODEL') {
      const brand = (product as Product & { brand?: string | null }).brand;
      const modelVal = brand
        ? `${brand} ${product.sku ?? product.name}`.slice(0, 60)
        : (product.sku ?? product.name).slice(0, 60);
      result.push({ id: 'MODEL', value_name: modelVal });
    } else if (attr.value_type === 'list' && attr.values && attr.values.length > 0) {
      // Try to match a product tag to an allowed value
      const tags = product.tags ?? [];
      const matched = attr.values.find((v) =>
        tags.some(
          (t) =>
            t.toLowerCase() === v.name.toLowerCase() ||
            v.name.toLowerCase().includes(t.toLowerCase()),
        ),
      );
      if (matched) {
        result.push({ id: attr.id, value_name: matched.name });
      } else {
        // Cannot resolve deterministically — let AI pick from allowed values
        unresolved.push({ id: attr.id, name: attr.name, value_type: attr.value_type, values: attr.values });
      }
    } else if (attr.value_type === 'string' || attr.value_type === 'number') {
      // Free-text required attr — let AI infer a contextual value
      unresolved.push({ id: attr.id, name: attr.name, value_type: attr.value_type, values: undefined });
    } else {
      console.warn(
        `[meli/sync] Required attribute "${attr.id}" (${attr.name}) not resolved for product ${product.id} category ${categoryId}`,
      );
    }
  }

  // AI fallback for any unresolved required attributes
  if (unresolved.length > 0) {
    console.info(`[meli/sync] Asking AI to resolve ${unresolved.length} attribute(s): ${unresolved.map((a) => a.id).join(', ')}`);
    const aiResolved = await resolveAttributesWithAI(product, unresolved);
    result.push(...aiResolved);
  }

  return result;
}

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

  const attributes = await buildAttributes(product, categoryId);

  return {
    title: product.name.slice(0, 60).trimEnd(),
    category_id: categoryId,
    price: meliPrice,
    currency_id: 'COP',
    available_quantity: product.stock,
    buying_mode: 'buy_it_now',
    condition: 'new',
    listing_type_id: listingType,
    description: { plain_text: product.description },
    pictures,
    ...(attributes.length > 0 && { attributes }),
    shipping: {
      mode: 'me2',
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
      status: mapApiStatusToDb(response.status),
      meliPrice,
      syncedProductPrice: product.price,
      syncedProductStock: product.stock,
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

  let statusUpdate = listing.status;
  try {
    const meliItem = await meliApi.getItem(listing.meliItemId);
    statusUpdate = mapApiStatusToDb(meliItem.status);
  } catch {
    // keep previous status if live check fails
  }

  await prisma.meliListing.update({
    where: { productId },
    data: {
      meliPrice,
      status: statusUpdate,
      lastSyncAt: new Date(),
      syncedProductPrice: product.price,
      syncedProductStock: product.stock,
    },
  });
}

// ─── Smart upsert ─────────────────────────────────────────────────────────────
export async function syncProduct(productId: string): Promise<{ action: 'published' | 'updated' | 'republished' }> {
  const listing = await prisma.meliListing.findUnique({ where: { productId } });

  if (!listing) {
    await publishProduct(productId);
    return { action: 'published' };
  }

  // Check real status on MeLi before attempting update.
  // If the seller deleted the item on MeLi it comes back as 'closed' and
  // price/quantity updates are rejected — we must re-publish instead.
  try {
    const meliItem = await meliApi.getItem(listing.meliItemId);
    if (meliItem.status === 'closed') {
      // Remove stale listing and create a new one
      await prisma.meliListing.delete({ where: { productId } });
      await publishProduct(productId);
      return { action: 'republished' };
    }
  } catch {
    // If getItem itself fails (e.g. 404 — item gone), also re-publish
    await prisma.meliListing.delete({ where: { productId } });
    await publishProduct(productId);
    return { action: 'republished' };
  }

  await updateStockAndPrice(productId);
  return { action: 'updated' };
}

// ─── Bulk sync all products with meliExport = true ───────────────────────────
/** Process `items` in chunks of `size`, awaiting a `delayMs` pause between each chunk. */
async function runInBatches<T>(
  items: T[],
  size: number,
  delayMs: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    await Promise.all(batch.map(fn));
    if (i + size < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

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

  await runInBatches(products, 5, 1000, async ({ id }) => {
    try {
      await syncProduct(id);
      synced++;
    } catch (err) {
      errors.push({ productId: id, error: err instanceof Error ? err.message : String(err) });
    }
  });

  return { synced, errors };
}

/** Sync only products marked for MeLi that are not published yet (or in ERROR). */
export async function bulkSyncPendingProducts(): Promise<{
  synced: number;
  errors: { productId: string; error: string }[];
}> {
  const products = await prisma.product.findMany({
    where: {
      meliExport: true,
      stock: { gt: 0 },
      OR: [{ meliListing: null }, { meliListing: { status: 'ERROR' } }],
    },
    select: { id: true },
  });

  let synced = 0;
  const errors: { productId: string; error: string }[] = [];

  await runInBatches(products, 5, 1000, async ({ id }) => {
    try {
      await syncProduct(id);
      synced++;
    } catch (err) {
      errors.push({ productId: id, error: err instanceof Error ? err.message : String(err) });
    }
  });

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

// ─── Process a MeLi order: reduce stock, save record (idempotent) ─────────────
export async function processMeliOrder(meliOrderId: string): Promise<void> {
  // Idempotency — skip if already processed
  const existing = await prisma.meliOrder.findUnique({ where: { meliOrderId } });
  if (existing) return;

  // Fetch order details from MeLi
  const order = await meliApi.getOrder(meliOrderId);

  // Only process orders where payment is confirmed
  const processableStatuses = ['paid', 'payment_required', 'partially_refunded'];
  if (!processableStatuses.includes(order.status)) {
    // Save record but don't touch stock (e.g. cancelled / pending)
    await prisma.meliOrder.create({
      data: {
        meliOrderId,
        rawPayload: order as unknown as import('@prisma/client').Prisma.InputJsonValue,
        status: order.status,
        shipmentId: order.shipping?.id ? String(order.shipping.id) : null,
      },
    });
    return;
  }

  // Reduce stock for each item sold
  for (const orderItem of order.order_items) {
    const listing = await prisma.meliListing.findFirst({
      where: { meliItemId: orderItem.item.id },
      select: { productId: true },
    });
    if (!listing) {
      console.warn(`[meli/order] No local product found for MeLi item ${orderItem.item.id}`);
      continue;
    }

    // Decrement local stock (floor at 0)
    await prisma.product.update({
      where: { id: listing.productId },
      data: { stock: { decrement: orderItem.quantity } },
    });

    // Push updated stock back to MeLi listing
    try {
      await updateStockAndPrice(listing.productId);
    } catch (err) {
      console.error(`[meli/order] Failed to sync stock back to MeLi for ${listing.productId}:`, err);
    }
  }

  // Persist the order record
  await prisma.meliOrder.create({
    data: {
      meliOrderId,
      rawPayload: order as unknown as import('@prisma/client').Prisma.InputJsonValue,
      status: order.status,
      shipmentId: order.shipping?.id ? String(order.shipping.id) : null,
    },
  });
}

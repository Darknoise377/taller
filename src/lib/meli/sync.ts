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
const GTIN        = 'GTIN';
const LINE        = 'LINE';

type UnresolvedAttr = Pick<MeliCategoryAttribute, 'id' | 'name' | 'value_type' | 'values' | 'allowed_units'>;

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
    if (a.value_type === 'number_unit') {
      const units = a.allowed_units?.map((u) => u.name).join(', ');
      return `- ${a.name} (ID: ${a.id}): número con unidad${units ? `, unidades permitidas: ${units}` : ''}, ej. "1 L" o "500 mL"`;
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

  // Incluir atributos requeridos incluso si están hidden (structured-data)
  // El error "item.attribute.missing_catalog_required" indica que hay hidden requeridos
  // Procesamos TODOS los atributos no read_only (incluye required + hidden required)
  const requiredAttrs = categoryAttrs.filter((a) => a.tags.required && !a.tags.read_only);
  const result: { id: string; value_name: string }[] = [];
  const unresolved: UnresolvedAttr[] = [];

  // Debug: log todos los atributos requeridos
  console.info(`[meli/sync] Required attrs for ${categoryId}:`, requiredAttrs.map(a => ({ id: a.id, name: a.name, hidden: a.tags.hidden, value_type: a.value_type })));

  for (const attr of requiredAttrs) {
    // Detectar y resolver atributos LINE y GTIN primero (los más problemáticos)
    const isLineAttr = attr.id === LINE || attr.id === 'LINE' || attr.name?.toLowerCase().includes('línea');
    const isGtinAttr = attr.id === GTIN;
    
    if (isLineAttr) {
      const brand = (product as Product & { brand?: string | null }).brand;
      const lineValue = brand || product.tags?.[0] || 'Genérico';
      if (attr.value_type === 'list' && attr.values) {
        const matched = attr.values.find(v => v.name.toLowerCase().includes(lineValue.toLowerCase()));
        if (matched) result.push({ id: attr.id, value_name: matched.name });
      } else {
        result.push({ id: attr.id, value_name: lineValue.slice(0, 60) });
      }
      continue;
    }
    
    if (isGtinAttr) {
      const gtinValue = product.sku || product.diagramNumber || `GEN-${product.id.slice(-8)}`;
      result.push({ id: GTIN, value_name: gtinValue });
      continue;
    }
    
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
    } else if (attr.id === 'UNIT_VOLUME') {
      // Try to extract volume directly from product name/description before calling AI
      const volumeMatch = [product.name, product.description ?? ''].join(' ')
        .match(/(\d+(?:[.,]\d+)?)\s*(ml|mL|cc|CC|l(?!\w)|L(?!\w)|gal(?:ón|on)?)/i);
      if (volumeMatch) {
        const num = volumeMatch[1].replace(',', '.');
        const rawUnit = volumeMatch[2].toLowerCase();
        const unit = rawUnit === 'l' ? 'L' : rawUnit === 'ml' || rawUnit === 'cc' ? 'mL' : rawUnit;
        result.push({ id: 'UNIT_VOLUME', value_name: `${num} ${unit}` });
      } else {
        // Fallback genérico que cumple el formato requerido
        console.info(`[meli/sync] UNIT_VOLUME using 1 mL fallback for ${product.id}`);
        result.push({ id: 'UNIT_VOLUME', value_name: '1 mL' });
      }
    } else if (attr.id === 'MODEL_LINE' || attr.id === 'LINE_TYPE') {
      // Variante del atributo "Línea"
      const brand = (product as Product & { brand?: string | null }).brand;
      const lineValue = brand || product.tags?.[0] || 'Genérico';
      result.push({ id: attr.id, value_name: lineValue.slice(0, 60) });
    } else if (attr.value_type === 'string' || attr.value_type === 'number' || attr.value_type === 'number_unit') {
      // Free-text / numeric required attr — let AI infer a contextual value
      unresolved.push({ id: attr.id, name: attr.name, value_type: attr.value_type, values: undefined, allowed_units: attr.allowed_units });
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
    
    // No agregar si ya fue resuelto manualmente, y filtrar valores vacíos/inválidos devueltos por IA
    const existingIds = new Set(result.map((a) => a.id));
    for (const attr of aiResolved) {
      if (!attr.id || !attr.value_name?.trim()) continue;
      // Rechazar valores inválidos como "No aplica", "N/A", etc.
      const lowerVal = attr.value_name.toLowerCase();
      if (lowerVal.includes('no aplica') || lowerVal.includes('n/a') || lowerVal === '-') continue;
      if (existingIds.has(attr.id)) continue;
      result.push(attr);
      existingIds.add(attr.id);
    }
  }

  return result;
}

// ─── Título saneado para cumplir reglas de MeLi ──────────────────────────────
const MELI_FORBIDDEN_TITLE_WORDS = /\b(oferta|descuento|gratis|promo|rebaja|sale|%off|envio gratis)\b/gi;

function sanitizeTitle(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, '')           // quitar URLs
    .replace(/\S+@\S+\.\S+/g, '')              // quitar emails
    .replace(/\b\d[\d\s\-().]{6,}\d\b/g, '')   // quitar teléfonos
    .replace(MELI_FORBIDDEN_TITLE_WORDS, '')    // palabras promocionales prohibidas
    .replace(/\$[\d.,]+/g, '')                  // precios en el título
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trimEnd();
}

// ─── Build a MeLi item payload from a local product ─────────────────────────
async function buildPayload(
  product: Product,
  categoryId: string,
): Promise<MeliItemPayload & { _meliPrice: number }> {
  const listingType = product.meliListingType || 'gold_special';
  const { meliPrice } = await calculateMeliPrice(product.price, listingType);

  const pictures =
    product.images?.length
      ? product.images.map((url) => ({ source: url }))
      : product.imageUrl
      ? [{ source: product.imageUrl }]
      : [];

  // Guard: MeLi requiere al menos 1 imagen
  if (pictures.length === 0) {
    throw new Error(
      `El producto ${product.id} ("${product.name}") no tiene imágenes. MeLi requiere al menos una.`,
    );
  }

  const attributes = await buildAttributes(product, categoryId);

  return {
    title: sanitizeTitle(product.name),
    category_id: categoryId,
    price: meliPrice,
    currency_id: 'COP',
    available_quantity: product.stock,
    buying_mode: 'buy_it_now',
    condition: 'new',
    listing_type_id: listingType,
    // Evitar null en plain_text
    description: { plain_text: product.description?.slice(0, 50000) ?? '' },
    pictures,
    ...(attributes.length > 0 && { attributes }),
    // Garantía estándar para repuestos
    sale_terms: [
      { id: 'WARRANTY_TYPE', value_name: 'Garantía del vendedor' },
      { id: 'WARRANTY_TIME', value_name: '90 días' },
    ],
    shipping: {
      mode: 'me2',
      local_pick_up: true,
      free_shipping: false,
    },
    // Campo interno — no lo recibe la API de MeLi, se stripea antes de enviar
    _meliPrice: meliPrice,
  };
}

// ─── Resolve MeLi category_id for a local product ───────────────────────────
async function resolveCategoryId(product: Product): Promise<string> {
  const { categoryMap } = await getMeliConfig();
  const localCat = String(product.category).toLowerCase();

  if (categoryMap[localCat]) return categoryMap[localCat];

  // Mapa predeterminado de categorías de repuestos para motos (MCO - Colombia)
  // NOTA: Estos IDs pueden estar desactualizados. Únete el categoryMap en /api/meli/config
  // con los IDs reales obtenidos de: https://api.mercadolibre.com/sites/MCO/categories
  const DEFAULT_CATEGORY_MAP: Record<string, string> = {
    refrigeracion: 'MCO429228',   // Refrigeración (usar MCO_MOTO_REFRIGERATION cuando esté disponible)
    motor: 'MCO429228',          // Motor - usa la misma categoría hasta encontrar la correcta
    frenos: 'MCO429228',
    llantas: 'MCO429228',
    cilindros: 'MCO429228',
    aceites_lubricantes: 'MCO429228',
    filtros: 'MCO429228',
    baterias: 'MCO429228',
    transmision: 'MCO429228',
    kit_arrastre: 'MCO429228',
    suspension: 'MCO429228',
    escape: 'MCO429228',
    electrico: 'MCO429228',
    iluminacion: 'MCO429228',
    carenaje: 'MCO429228',
    accesorios: 'MCO429228',
  };

  if (DEFAULT_CATEGORY_MAP[localCat]) {
    console.info(`[meli/sync] Using fallback category ${DEFAULT_CATEGORY_MAP[localCat]} for local category ${localCat}. Update config to use correct IDs.`);
    return DEFAULT_CATEGORY_MAP[localCat];
  }

  // Auto-predict via MeLi API (best-effort)
  // MEJORA: Enriquecer el string de predicción para evitar malas categorizaciones (ej: Ventilador -> Electrodoméstico)
  try {
    const tagsContext = product.tags?.join(' ') || '';
    const categoryContext = product.category ? String(product.category) : '';
    const brandContext = (product as Product & { brand?: string | null }).brand || '';
    
        // Construimos un título falso súper descriptivo solo para el Predictor de Meli
    const enrichedPredictionString = `Repuestos Motos y Cuatrimotos ${categoryContext} ${brandContext} ${product.name} ${tagsContext}`.trim().replace(/\s+/g, ' ');
    
    console.info(`[meli/sync] Predicting category using enriched string: "${enrichedPredictionString.substring(0, 80)}..."`);
    const predictions = await meliApi.predictCategory(enrichedPredictionString);
    
    if (predictions.length > 0) {
      // Forzamos que la predicción seleccionada contenga algo de motos o repuestos de vehículos para evitar que caiga en Agro/Electrodomésticos
      const validPrediction = predictions.find(p => {
        const domainId = (p.domain_id || '').toLowerCase();
        const domainName = (p.domain_name || '').toLowerCase();
        const categoryName = (p.category_name || '').toLowerCase();
        return (
          domainId.includes('motocycle') ||
          domainId.includes('vehicle') ||
          domainId.includes('motorcycle') ||
          domainId.includes('moto') ||
          domainName.includes('moto') ||
          categoryName.includes('moto') ||
          categoryName.includes('repuesto') ||
          categoryName.includes('radiador') // Casos específicos que sabemos que son correctos
        );
      });

      const finalCategoryId = validPrediction ? validPrediction.category_id : predictions[0].category_id;
      console.info(`[meli/sync] Predicted Category: ${finalCategoryId} (Domain: ${validPrediction?.domain_id || predictions[0].domain_id})`);
      return finalCategoryId;
    }
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

  // Validar stock antes de intentar publicar
  if (product.stock <= 0) {
    throw new Error(`No se puede publicar el producto ${productId}: stock es 0.`);
  }

  const categoryId = await resolveCategoryId(product);
  const payload = await buildPayload(product, categoryId);
  
    // Reusar el precio calculado en buildPayload para evitar inconsistencias de listingType
  const { _meliPrice: meliPrice, ...meliPayload } = payload;

  const response = await meliApi.createItem(meliPayload as MeliItemPayload);

  await prisma.meliListing.create({
    data: {
      productId,
      meliItemId: response.id,
      meliPermalink: response.permalink,
      status: mapApiStatusToDb(response.status),
      meliPrice,
      syncedProductPrice: product.price,
      syncedProductStock: product.stock,
      lastSyncAt: new Date(),
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

  // Verificar estado ANTES de updateItem para incluir reactivación si hace falta
  let currentMeliStatus: string | undefined;
  let shouldReactivate = false;
  try {
    const meliItem = await meliApi.getItem(listing.meliItemId);
    currentMeliStatus = meliItem.status;
    // Si está pausado (por stock 0 previo) y ahora hay stock, reactivar
    shouldReactivate = meliItem.status === 'paused' && product.stock > 0;
  } catch {
    // Si falla el GET, igual intentamos el update sin tocar status
  }

    try {
    await meliApi.updateItem(listing.meliItemId, {
      price: meliPrice,
      available_quantity: product.stock,
      ...(shouldReactivate && { status: 'active' }),
    });
    } catch (err: unknown) {
    // Si el ítem ya no se puede actualizar porque fue borrado/inactivado directamente en MeLi
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (
      errorMessage.includes('status:inactive') ||
      errorMessage.includes('not modifiable') ||
      errorMessage.includes('field_not_updatable') ||
      errorMessage.includes('item.price.not_modifiable')
    ) {
      console.warn(`[meli/sync] Listing ${listing.meliItemId} (Product ${productId}) no es actualizable. Se eliminará el registro local.`);
      await prisma.meliListing.delete({ where: { productId } });
      throw new Error(`La publicación MCO en Mercado Libre está inactiva o fue eliminada manualmente. Se desvinculó de la base de datos local para que la próxima sincronización la vuelva a publicar.`);
    }
    throw err;
  }

  await prisma.meliListing.update({
    where: { productId },
    data: {
      meliPrice,
      status: currentMeliStatus
        ? mapApiStatusToDb(shouldReactivate ? 'active' : currentMeliStatus)
        : listing.status,
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

  try {
    const meliItem = await meliApi.getItem(listing.meliItemId);
        if (meliItem.status === 'closed' || meliItem.status === 'inactive') {
      // Borrar SÓLO si el republish tiene éxito
      await prisma.meliListing.delete({ where: { productId } });
      await publishProduct(productId);
      return { action: 'republished' };
    }
  } catch {
    // Si getItem falla (404), intentar republish — si falla, el listing viejo sigue intacto localmente
    try {
      await prisma.meliListing.delete({ where: { productId } });
      await publishProduct(productId);
      return { action: 'republished' };
    } catch (publishErr) {
      throw new Error(
        `Republish fallido para ${productId}. Listing eliminado localmente pero no re-creado. Causa: ${
          publishErr instanceof Error ? publishErr.message : String(publishErr)
        }`
      );
    }
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

        // Decrement local stock (floor at 0 real)
    const currentProduct = await prisma.product.findUniqueOrThrow({
      where: { id: listing.productId },
      select: { stock: true },
    });

    await prisma.product.update({
      where: { id: listing.productId },
      data: { stock: Math.max(0, currentProduct.stock - orderItem.quantity) },
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

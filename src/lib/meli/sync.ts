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
    if (a.value_type === 'number') {
      return `- ${a.name} (ID: ${a.id}): SOLO un número entero, sin texto ni rangos (ej. "2020", nunca "2015-2020" ni "Varios")`;
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

  // Debug: log todos los atributos de la categoría
  console.info(`[meli/sync] ALL attrs for ${categoryId}:`, categoryAttrs.map(a => ({ 
    id: a.id, 
    name: a.name, 
    hidden: a.tags.hidden, 
    required: a.tags.required,
    read_only: a.tags.read_only 
  })));
  
  console.info(`[meli/sync] Required attrs for ${categoryId}:`, requiredAttrs.map(a => ({ id: a.id, name: a.name, hidden: a.tags.hidden, value_type: a.value_type })));
  
  // Forzar inclusión de atributos comunes que vienen como catalog_required sin required flag
  // Estos son obligatorios pero MeLi no los marca como required=true en la API
  const catalogRequiredIds = ['LINE', 'GTIN', 'MODEL'];
  const catalogRequiredAttrs = categoryAttrs.filter((a) => 
    catalogRequiredIds.includes(a.id) && !a.tags.read_only && !requiredAttrs.some(r => r.id === a.id)
  );
  if (catalogRequiredAttrs.length > 0) {
    console.info(`[meli/sync] Catalog required attrs added:`, catalogRequiredAttrs.map(a => a.id));
    requiredAttrs.push(...catalogRequiredAttrs);
  }

  for (const attr of requiredAttrs) {
    // Detectar y resolver atributos LINE y GTIN primero (los más problemáticos)
    const isLineAttr = attr.id === LINE || attr.id === 'LINE' || attr.name?.toLowerCase().includes('línea');
    const isGtinAttr = attr.id === GTIN;

    if (attr.id === 'VEHICLE_TYPE' && attr.value_type === 'list' && attr.values) {
      // La tienda es 100% de motos: si la categoría ofrece una opción de moto/cuatriciclo, usarla siempre
      const motoValue = attr.values.find((v) => /moto|cuatriciclo|cuatrimoto|atv/i.test(v.name));
      if (motoValue) result.push({ id: 'VEHICLE_TYPE', value_name: motoValue.name });
      continue;
    }

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
      // GTIN es requerido solo para ciertas categorías (ej: lubricantes, no suspensiones)
      // Si el producto NO es lubricante, saltar GTIN para evitar error "invalid_format"
      const isLubricantCategory = categoryId === 'MCO429228' || product.category === 'aceites_lubricantes';
      if (!isLubricantCategory) {
        console.info(`[meli/sync] Skipping GTIN for non-lubricant product ${product.id}`);
        continue;
      }
      // Para lubricantes, intentar con valor real
      const rawGtin = product.sku || product.diagramNumber || '';
      const numericOnly = rawGtin.replace(/\D/g, '');
      if (numericOnly.length >= 12 && numericOnly.length <= 14 && /^\d+$/.test(numericOnly)) {
        result.push({ id: GTIN, value_name: numericOnly.slice(0, 13) });
      } else {
        // GTIN genérico para lubricantes sin código real (13 dígitos)
        result.push({ id: GTIN, value_name: '0000000000000' });
      }
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
    } else if (attr.id === 'VISCOSITY_GRADE') {
      // Para suspensiones y otros repuestos que no son fluidos, usar valor genérico
      // MeLi requiere este atributo incluso cuando no aplica
      const viscosityTag = product.tags?.find(t => /S[AE]\d{2}i?\d{2}/i.test(t) || /viscos/i.test(t));
      if (viscosityTag) {
        result.push({ id: 'VISCOSITY_GRADE', value_name: viscosityTag });
      } else {
        // Fallback genérico - "No aplica" causará error, usar valor neutro
        result.push({ id: 'VISCOSITY_GRADE', value_name: 'No definido' });
      }
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
    console.info(`[meli/sync] AI resolved:`, aiResolved);
    
    const unresolvedById = new Map(unresolved.map((a) => [a.id, a]));

    // No agregar si ya fue resuelto manualmente, y filtrar valores vacíos/inválidos devueltos por IA
    const existingIds = new Set(result.map((a) => a.id));
    for (const attr of aiResolved) {
      if (!attr.id || !attr.value_name?.trim()) continue;
      // Rechazar valores inválidos como "No aplica", "N/A", etc.
      const lowerVal = attr.value_name.toLowerCase();
      if (lowerVal.includes('no aplica') || lowerVal.includes('n/a') || lowerVal === '-') continue;
      if (existingIds.has(attr.id)) continue;

      // MeLi exige formato numérico estricto para value_type "number" (ej. "Año"): la IA a veces
      // devuelve texto ("2015-2020", "Varios") que MeLi rechaza con item.attribute.number_invalid_format
      const meta = unresolvedById.get(attr.id);
      if (meta?.value_type === 'number') {
        const yearOrNumberMatch = attr.value_name.match(/\d{4}|\d+/);
        if (!yearOrNumberMatch) {
          console.warn(`[meli/sync] Skipping "${attr.id}" — AI value "${attr.value_name}" is not numeric.`);
          continue;
        }
        result.push({ id: attr.id, value_name: yearOrNumberMatch[0] });
        existingIds.add(attr.id);
        continue;
      }

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

  const title = sanitizeTitle(product.name);

  return {
    // No enviar "title": la cuenta está en el modelo User Products, que lo rechaza (body.invalid_fields)
    family_name: title,
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

const MOTO_TERMS = /moto|cuatriciclo|cuatrimoto|atv/i;
// Términos de rubros que sabemos NO son motos, para descartar predicciones obviamente erróneas
// (ej. "Repuestos Maquinaria Agrícola") cuando la categoría no declara VEHICLE_TYPE
const NON_MOTO_DOMAIN_TERMS = /agr[ií]cola|agro|tractor|marin|n[aá]utic|aeron|industrial/i;

/**
 * MeLi comparte el mismo árbol de categorías ("Repuestos Carros y Camionetas") entre piezas de
 * autos y de motos — el nombre del breadcrumb NO indica el rubro real. La fuente de verdad es el
 * atributo "VEHICLE_TYPE" (o similar) de la categoría: si existe y solo permite valores de auto
 * (Automóvil, Camioneta, SUV...) sin ninguna opción de moto, la categoría es exclusiva de carros.
 * Si no existe ese atributo, no podemos afirmar que sea de carros solo por el nombre del breadcrumb.
 */
async function categoryAllowsMoto(categoryId: string): Promise<boolean> {
  try {
    const attrs = await meliApi.getCategoryAttributes(categoryId);
    const vehicleTypeAttr = attrs.find(
      (a) => a.id === 'VEHICLE_TYPE' || a.name?.toLowerCase().includes('tipo de vehículo'),
    );
    if (!vehicleTypeAttr?.values?.length) return true; // sin distinción explícita de vehículo, no bloquear
    return vehicleTypeAttr.values.some((v) => MOTO_TERMS.test(v.name));
  } catch {
    return true; // si falla la consulta, no bloqueamos la predicción por esto
  }
}

/** Nombre de hoja + breadcrumb legible de una categoría MeLi, para mostrar "dónde quedó publicado" en el admin. */
async function getCategoryLabel(
  categoryId: string,
): Promise<{ name: string | null; path: string | null }> {
  try {
    const detail = await meliApi.getCategory(categoryId);
    return {
      name: detail.name ?? null,
      path: detail.path_from_root?.map((c) => c.name).join(' > ') ?? null,
    };
  } catch {
    return { name: null, path: null }; // best-effort — no debe bloquear la publicación
  }
}

// ─── Resolve MeLi category_id for a local product ───────────────────────────
async function resolveCategoryId(product: Product): Promise<string> {
  const { categoryMap } = await getMeliConfig();
  const localCat = String(product.category).toLowerCase();

  const mappedCategoryId = categoryMap[localCat];
  if (mappedCategoryId) {
    // Validar el mapeo manual también: si el atributo VEHICLE_TYPE de esa categoría solo admite
    // carros (sin opción de moto), ignorarlo en vez de publicar mal una y otra vez
    if (await categoryAllowsMoto(mappedCategoryId)) return mappedCategoryId;
    console.warn(
      `[meli/sync] El mapeo de categoría para "${localCat}" (${mappedCategoryId}) es exclusivo de carros (VEHICLE_TYPE sin opción moto). Se ignora y se usa predicción automática. Corrige el mapeo en Ajustes > MeLi.`,
    );
  }

  // Usar predicción automática siempre que el mapa no tenga la categoría (o esté mal configurada)
  console.info(`[meli/sync] No valid mapping for ${localCat}, using auto-prediction`);
  
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
      // 1) Descartar rubros obviamente ajenos (agro, náutica, industrial...) por nombre de dominio/categoría
      const domainCandidates = predictions.filter((p) => {
        const leafText = `${p.domain_id || ''} ${p.domain_name || ''} ${p.category_name || ''}`;
        return !NON_MOTO_DOMAIN_TERMS.test(leafText);
      });

      if (domainCandidates.length === 0) {
        throw new Error(
          `Ninguna categoría predicha para "${product.name}" pertenece al rubro de motos (candidatas: ${predictions.map((p) => p.category_name).join(', ')}). Configura la categoría manualmente en Ajustes de MeLi.`,
        );
      }

      // 2) Entre las candidatas plausibles, verificar contra la fuente de verdad: el atributo VEHICLE_TYPE
      const motoFlags = await Promise.all(domainCandidates.map((p) => categoryAllowsMoto(p.category_id)));
      const motoPredictions = domainCandidates.filter((_, i) => motoFlags[i]);

      if (motoPredictions.length === 0) {
        throw new Error(
          `Todas las categorías predichas para "${product.name}" son exclusivas de carros (VEHICLE_TYPE sin opción moto). Configura la categoría manualmente en Ajustes de MeLi.`,
        );
      }

      const finalCategoryId = motoPredictions[0].category_id;
      console.info(`[meli/sync] Predicted Category: ${finalCategoryId} (Domain: ${motoPredictions[0].domain_id})`);
      return finalCategoryId;
    }
  } catch (err) {
    // Preservar el error de categorización — es información accionable, no un fallo de red
    if (err instanceof Error && err.message.includes('rubro de motos')) throw err;
    if (err instanceof Error && err.message.includes('exclusivas de carros')) throw err;
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
  const categoryLabel = await getCategoryLabel(categoryId);

  await prisma.meliListing.create({
    data: {
      productId,
      meliItemId: response.id,
      meliPermalink: response.permalink,
      status: mapApiStatusToDb(response.status),
      meliPrice,
      syncedProductPrice: product.price,
      syncedProductStock: product.stock,
      meliCategoryId: categoryId,
      meliCategoryName: categoryLabel.name,
      meliCategoryPath: categoryLabel.path,
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
function computeRealCommission(order: import('./client').MeliOrderResponse): number | null {
  const fromPayments = order.payments
    ?.map((p) => p.marketplace_fee)
    .filter((v): v is number => typeof v === 'number')
    .reduce((sum, v) => sum + v, 0);
  if (fromPayments !== undefined && fromPayments > 0) return fromPayments;

  // Fallback: sum sale_fee * quantity per line (sale_fee is expressed per unit, like unit_price)
  const fromItems = order.order_items
    .filter((oi) => typeof oi.sale_fee === 'number')
    .reduce((sum, oi) => sum + (oi.sale_fee as number) * oi.quantity, 0);
  return fromItems > 0 ? fromItems : null;
}

/** Best-effort: real shipping cost charged to the seller for this order's shipment. */
async function fetchRealShippingCost(order: import('./client').MeliOrderResponse): Promise<number | null> {
  if (!order.shipping?.id) return null;
  const shipmentId = String(order.shipping.id);
  try {
    // /shipments/{id}/costs is authoritative: receiver.cost is what the BUYER paid
    // (0 = free shipping for the buyer) and senders[0].cost is what the SELLER pays.
    // Do NOT use /shipments/{id}.order_cost: that field equals the order's total_amount,
    // not the shipping cost — reading it makes the Envío column show the gross amount.
    const costs = await meliApi.getShipmentCosts(shipmentId);
    const sellerCost = costs?.senders?.[0]?.cost;
    return typeof sellerCost === 'number' ? sellerCost : null;
  } catch (err) {
    console.warn(`[meli/order] Failed to fetch shipment cost for order ${order.id}:`, err);
    return null;
  }
}

export async function processMeliOrder(meliOrderId: string): Promise<void> {
  // Fetch order details from MeLi
  const order = await meliApi.getOrder(meliOrderId);
  const realCommission = computeRealCommission(order);
  const realShippingCost = await fetchRealShippingCost(order);

  const processableStatuses = ['paid', 'payment_required', 'partially_refunded'];
  const isProcessable = (status: string) => processableStatuses.includes(status);

  const applyStockDeductions = async () => {
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
  };

  const existing = await prisma.meliOrder.findUnique({ where: { meliOrderId } });
  if (existing) {
    // If payment status changed from non-processable -> processable, apply stock now.
    if (!isProcessable(existing.status) && isProcessable(order.status)) {
      await applyStockDeductions();
    }

    await prisma.meliOrder.update({
      where: { meliOrderId },
      data: {
        rawPayload: order as unknown as import('@prisma/client').Prisma.InputJsonValue,
        status: order.status,
        shipmentId: order.shipping?.id ? String(order.shipping.id) : null,
        realCommission,
        realShippingCost,
      },
    });
    return;
  }

  if (!isProcessable(order.status)) {
    // Save record but don't touch stock (e.g. cancelled / pending)
    await prisma.meliOrder.create({
      data: {
        meliOrderId,
        rawPayload: order as unknown as import('@prisma/client').Prisma.InputJsonValue,
        status: order.status,
        shipmentId: order.shipping?.id ? String(order.shipping.id) : null,
        realCommission,
        realShippingCost,
      },
    });
    return;
  }

  await applyStockDeductions();

  // Persist the order record
  await prisma.meliOrder.create({
    data: {
      meliOrderId,
      rawPayload: order as unknown as import('@prisma/client').Prisma.InputJsonValue,
      status: order.status,
      shipmentId: order.shipping?.id ? String(order.shipping.id) : null,
      realCommission,
      realShippingCost,
    },
  });
}

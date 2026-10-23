/**
 * Category audit and diagnostic helper for Mercado Libre Colombia (MCO).
 * Analyzes whether a product is published in the correct motorcycle parts section
 * or if it was mistakenly assigned to cars, industrial machinery, or a different component category.
 */

export interface CategoryAuditResult {
  status: 'correct' | 'warning' | 'mismatch' | 'unassigned';
  label: string;
  reason: string;
  isMotoDomain: boolean;
  needsCorrection: boolean;
}

const NON_MOTO_DOMAIN_TERMS = /agr[ií]cola|agro|tractor|marin|n[aá]utic|aeron|industrial|electrodom[eé]stico|computaci[oó]n|celular/i;
const MOTO_TERMS = /moto|cuatriciclo|cuatrimoto|atv|scooter|motocicleta/i;
const CAR_TERMS = /carros? y camionetas?|autom[oó]vil|veh[ií]culos pesados|camiones/i;

// Keyword mappings for local categories to detect obvious category cross-overs
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  frenos: /freno|pastilla|disco|bomba de freno|caliper|mordaza|zapata|balata|guaya/i,
  llantas: /llanta|neum[aá]tico|rin|rin de moto|cubierta/i,
  aceites_lubricantes: /aceite|lubricante|grasa|l[ií]quido|aditivo/i,
  cilindros: /cilindro|pist[oó]n|anillo|culata|motor|biel[ao]|v[aá]lvula/i,
  filtros: /filtro|aire|gasolina|combustible|aceite/i,
};

export function auditProductCategory(params: {
  productCategory?: string | null;
  meliCategoryName?: string | null;
  meliCategoryPath?: string | null;
  meliCategoryId?: string | null;
  configuredCategoryId?: string | null;
}): CategoryAuditResult {
  const {
    productCategory,
    meliCategoryName,
    meliCategoryPath,
    meliCategoryId,
    configuredCategoryId,
  } = params;

  if (!meliCategoryId || !meliCategoryName) {
    return {
      status: 'unassigned',
      label: 'Sin publicar',
      reason: 'El producto aún no cuenta con categoría asignada en Mercado Libre.',
      isMotoDomain: false,
      needsCorrection: false,
    };
  }

  const pathAndName = `${meliCategoryPath || ''} ${meliCategoryName || ''}`.toLowerCase();

  // 1. Critical Mismatch: Belongs to completely non-moto or industrial domains
  if (NON_MOTO_DOMAIN_TERMS.test(pathAndName)) {
    return {
      status: 'mismatch',
      label: 'Rubro ajeno',
      reason: `Publicado en un rubro incompatible con motos (${meliCategoryName}). Debe corregirse de inmediato.`,
      isMotoDomain: false,
      needsCorrection: true,
    };
  }

  // 2. Critical Mismatch: Listed under Cars / Trucks without Moto context
  if (CAR_TERMS.test(pathAndName) && !MOTO_TERMS.test(pathAndName)) {
    return {
      status: 'mismatch',
      label: 'Sección Carros',
      reason: `Publicado en «${meliCategoryName}» dentro de Carros y Camionetas. Debe trasladarse a Repuestos Motos.`,
      isMotoDomain: false,
      needsCorrection: true,
    };
  }

  // 3. Warning: Doesn't match configured category in MeLi settings
  if (configuredCategoryId && configuredCategoryId !== meliCategoryId) {
    return {
      status: 'warning',
      label: 'Difiere del ajuste',
      reason: `La categoría actual (${meliCategoryName}) difiere de la categoría predeterminada configurada para ${productCategory || 'este tipo'}.`,
      isMotoDomain: MOTO_TERMS.test(pathAndName),
      needsCorrection: true,
    };
  }

  // 4. Semantic crossover mismatch (e.g. frenos in llantas or filtros)
  if (productCategory) {
    const localCat = String(productCategory).toLowerCase();

    // Check if category has expected keywords
    for (const [catKey, regex] of Object.entries(CATEGORY_KEYWORDS)) {
      if (catKey !== localCat && regex.test(meliCategoryName.toLowerCase())) {
        // Current category mentions another specific part type
        // e.g. local is 'frenos', but category name is 'Llantas' or 'Filtros de Aire'
        const isSelfExempt = localCat === 'filtros' && catKey === 'aceites_lubricantes'; // Filtro de aceite is ok
        if (!isSelfExempt) {
          return {
            status: 'mismatch',
            label: 'Sección cruzada',
            reason: `Producto de «${localCat}» publicado en sección de «${catKey}» (${meliCategoryName}).`,
            isMotoDomain: MOTO_TERMS.test(pathAndName),
            needsCorrection: true,
          };
        }
      }
    }
  }

  // 5. Validated Moto domain
  if (MOTO_TERMS.test(pathAndName)) {
    return {
      status: 'correct',
      label: 'Correcta (Motos)',
      reason: `Ubicado correctamente en la sección especializada de repuestos y accesorios para motocicletas.`,
      isMotoDomain: true,
      needsCorrection: false,
    };
  }

  // 6. Generic or ambiguous section
  return {
    status: 'warning',
    label: 'Sección general',
    reason: `Publicado en «${meliCategoryName}». Verifica si existe una sección más específica de repuestos para motos.`,
    isMotoDomain: false,
    needsCorrection: false,
  };
}

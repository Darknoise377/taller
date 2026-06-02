// src/config/shippingRates.ts
// Tarifas de envío por departamento (Servientrega / Coordinadora / Envia)
// Edita baseRate según las tarifas reales de tu transportadora.

export interface ShippingRegion {
  label: string;
  baseRate: number; // COP — flete estándar prepago
  departments: string[];
}

export type SeasonalThemeKey =
  | "none"
  | "mundial_2026"
  | "halloween"
  | "independencia"
  | "amor_amistad"
  | "black_week"
  | "navidad";

export type SeasonalVisualIntensity = "subtle" | "medium" | "full";

export interface SeasonalCampaignConfig {
  enabled: boolean;
  key: SeasonalThemeKey;
  intensity: SeasonalVisualIntensity;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

/**
 * Configuración global de envío — se persiste en StoreSettings.shippingRules.
 * Los valores por defecto se usan como fallback si la BD no tiene registro.
 */
export interface ShippingConfig {
  freeShippingAll: boolean;
  freeShippingThreshold: number;
  contraentregaSurcharge: number;
  regions: ShippingRegion[];
  seasonalCampaign?: SeasonalCampaignConfig;
}

/** Recargo fijo que cobran las transportadoras por servicio contraentrega (COD) */
export const CONTRAENTREGA_SURCHARGE = 8_000;

export const DEFAULT_SEASONAL_CAMPAIGN: SeasonalCampaignConfig = {
  enabled: false,
  key: "none",
  intensity: "full",
  title: "",
  subtitle: "",
  ctaLabel: "Ver ofertas",
  ctaHref: "/combos",
};

/** Tarifa base por región. Ajusta los valores según tu contrato. */
export const SHIPPING_REGIONS: ShippingRegion[] = [
  {
    label: 'Bogotá D.C.',
    baseRate: 9_000,
    departments: ['Bogotá D.C.'],
  },
  {
    label: 'Cundinamarca',
    baseRate: 11_000,
    departments: ['Cundinamarca'],
  },
  {
    label: 'Antioquia',
    baseRate: 12_000,
    departments: ['Antioquia'],
  },
  {
    label: 'Eje Cafetero',
    baseRate: 12_000,
    departments: ['Caldas', 'Quindío', 'Risaralda'],
  },
  {
    label: 'Valle del Cauca',
    baseRate: 13_000,
    departments: ['Valle del Cauca'],
  },
  {
    label: 'Santanderes',
    baseRate: 13_000,
    departments: ['Santander', 'Norte de Santander'],
  },
  {
    label: 'Atlántico',
    baseRate: 14_000,
    departments: ['Atlántico'],
  },
  {
    label: 'Centro',
    baseRate: 14_000,
    departments: ['Boyacá', 'Huila', 'Tolima'],
  },
  {
    label: 'Costa Caribe',
    baseRate: 16_000,
    departments: ['Bolívar', 'Cesar', 'Córdoba', 'La Guajira', 'Magdalena', 'Sucre', 'San Andrés y Providencia'],
  },
  {
    label: 'Llanos / Meta',
    baseRate: 17_000,
    departments: ['Meta', 'Casanare', 'Arauca'],
  },
  {
    label: 'Sur del país',
    baseRate: 19_000,
    departments: ['Cauca', 'Nariño', 'Putumayo', 'Caquetá', 'Huila'],
  },
  {
    label: 'Amazonía / Pacífico',
    baseRate: 28_000,
    departments: ['Amazonas', 'Guainía', 'Guaviare', 'Vaupés', 'Vichada', 'Chocó'],
  },
];

export function getRegionForDepartment(department: string, regions = SHIPPING_REGIONS): ShippingRegion | null {
  return regions.find((r) => r.departments.includes(department)) ?? null;
}

/** Default config — used as fallback when DB row doesn't exist yet. */
export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  freeShippingAll: false,
  freeShippingThreshold: 200_000,
  contraentregaSurcharge: CONTRAENTREGA_SURCHARGE,
  regions: SHIPPING_REGIONS,
  seasonalCampaign: DEFAULT_SEASONAL_CAMPAIGN,
};

export interface ShippingEstimate {
  baseRate: number;
  surcharge: number;
  total: number;
  isFreeBase: boolean;
  regionLabel: string | null;
}

export function estimateShipping(
  department: string,
  paymentMethod: 'WOMPI' | 'CONTRAENTREGA',
  cartTotal: number,
  freeShippingThreshold: number,
): ShippingEstimate {
  const region = getRegionForDepartment(department);
  const isFreeBase = cartTotal >= freeShippingThreshold;
  const baseRate = isFreeBase ? 0 : (region?.baseRate ?? 0);
  const surcharge = paymentMethod === 'CONTRAENTREGA' ? CONTRAENTREGA_SURCHARGE : 0;

  return {
    baseRate,
    surcharge,
    total: baseRate + surcharge,
    isFreeBase,
    regionLabel: region?.label ?? null,
  };
}

/**
 * Like estimateShipping but driven by a full ShippingConfig from the DB.
 * Handles the freeShippingAll flag and per-region rates.
 */
export function estimateShippingWithConfig(
  department: string,
  paymentMethod: 'WOMPI' | 'CONTRAENTREGA',
  cartTotal: number,
  config: ShippingConfig,
): ShippingEstimate {
  const region = getRegionForDepartment(department, config.regions);
  const isFreeBase = config.freeShippingAll || cartTotal >= config.freeShippingThreshold;
  const baseRate = isFreeBase ? 0 : (region?.baseRate ?? 0);
  const surcharge = paymentMethod === 'CONTRAENTREGA' ? config.contraentregaSurcharge : 0;

  return {
    baseRate,
    surcharge,
    total: baseRate + surcharge,
    isFreeBase,
    regionLabel: region?.label ?? null,
  };
}

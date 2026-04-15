export const PRODUCT_CATEGORIES = [
  "cilindros",
  "llantas",
  "frenos",
  "aceites_lubricantes",
  "filtros",
  "baterias",
  "transmision",
  "kit_arrastre",
  "suspension",
  "escape",
  "electrico",
  "iluminacion",
  "carenaje",
  "accesorios",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  cilindros: "Cilindros",
  llantas: "Llantas",
  frenos: "Frenos",
  aceites_lubricantes: "Aceites y lubricantes",
  filtros: "Filtros",
  baterias: "Baterias",
  transmision: "Transmision",
  kit_arrastre: "Kit de arrastre",
  suspension: "Suspension",
  escape: "Escape",
  electrico: "Sistema electrico",
  iluminacion: "Iluminacion",
  carenaje: "Carenaje",
  accesorios: "Accesorios",
};

export const PRODUCT_CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((value) => ({
  value,
  label: PRODUCT_CATEGORY_LABELS[value],
}));

export const PRODUCT_CATEGORY_DESCRIPTIONS: Record<ProductCategory, string> = {
  cilindros: "Cilindros y kits para recuperar potencia y compresion del motor.",
  llantas: "Llantas para calle y trabajo con medidas y labrado segun tu moto.",
  frenos: "Pastillas, discos y bandas para frenado seguro en todo momento.",
  aceites_lubricantes: "Aceites, liquidos y lubricantes para mantenimiento preventivo.",
  filtros: "Filtros de aire, aceite y combustible para mejor rendimiento del motor.",
  baterias: "Baterias de arranque con diferentes capacidades y tecnologia.",
  transmision: "Piezas de transmision para respuesta estable y menor desgaste.",
  kit_arrastre: "Cadenas, coronas y piones para reemplazo completo del arrastre.",
  suspension: "Amortiguadores y partes de suspension para confort y estabilidad.",
  escape: "Sistemas y repuestos de escape para flujo eficiente y sonido controlado.",
  electrico: "Reguladores, bobinas, estatores y repuestos del sistema electrico.",
  iluminacion: "Farolas, bombillos y luces LED para mejor visibilidad.",
  carenaje: "Plasticos, tapas y piezas de carroceria para restauracion estetica.",
  accesorios: "Accesorios funcionales para personalizar y proteger tu moto.",
};

export function isProductCategory(value: string): value is ProductCategory {
  return PRODUCT_CATEGORIES.includes(value as ProductCategory);
}

export function getProductCategoryLabel(category: string): string {
  if (isProductCategory(category)) return PRODUCT_CATEGORY_LABELS[category];
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getProductCategoryDescription(category: string): string | null {
  if (!isProductCategory(category)) return null;
  return PRODUCT_CATEGORY_DESCRIPTIONS[category];
}

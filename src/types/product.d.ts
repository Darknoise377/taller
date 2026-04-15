/**
 * @type ProductSize
 * @description Define los valores posibles para las tallas de un producto.
 */
export type ProductSize = string;

/**
 * @interface Product
 * @description Define la estructura de un producto en la tienda.
 */
export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: 'USD' | 'EUR' | 'COP';
  imageUrl?: string;
  images?: string[];
  category:
    | 'cilindros'
    | 'llantas'
    | 'frenos'
    | 'aceites_lubricantes'
    | 'filtros'
    | 'baterias'
    | 'transmision'
    | 'kit_arrastre'
    | 'suspension'
    | 'escape'
    | 'electrico'
    | 'iluminacion'
    | 'carenaje'
    | 'accesorios'
    ;
  sizes: ProductSize[];
  colors: string[];
  stock: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * @interface CategoryItem
 * @description Define una categoría de productos en la tienda.
 */
export interface CategoryItem {
  id?: string;
  name: string;
  slug: string;
  image?: string;
  count?: number; // 👈 agregado para mostrar cantidad de productos por categoría
}

/**
 * @interface CartItem
 * @description Estructura de un ítem dentro del carrito.
 */
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sizes?: string[];
  colors?: string[];
  currency: 'USD' | 'EUR' | 'COP';
}

/**
 * @interface CategoryStats
 * @description Estructura para estadísticas o conteo por categoría.
 */
export interface CategoryStats {
  category: string;
  totalProducts: number;
  totalStock: number;
}
// src/app/products/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import { getProductCategoryLabel, isProductCategory, PRODUCT_CATEGORIES } from '@/constants/productCategories';
import type { CategoryItem } from '@/types/product';
import type { Product } from '@/types/product';
import type { Combo } from '@/types/combo';
import type { HomeSearchCatalogItem } from '@/lib/seo/searchSuggestions';

const activeComboWhere = () => ({
  isActive: true,
  stock: { gt: 0 },
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

export async function getCategoriesForSeo(): Promise<CategoryItem[]> {
  try {
    const products = await prisma.product.findMany({
      select: { category: true, imageUrl: true },
    });

    const categoriesMap = new Map<string, { image: string; count: number }>();
    for (const p of products) {
      if (!p.category) continue;
      const current = categoriesMap.get(p.category);
      categoriesMap.set(p.category, {
        image: current?.image || p.imageUrl || '/images/placeholder.png',
        count: (current?.count ?? 0) + 1,
      });
    }

    return Array.from(categoriesMap, ([slug, meta]) => ({
      id: slug,
      slug,
      name: getProductCategoryLabel(slug),
      image: meta.image,
      count: meta.count,
    }));
  } catch {
    return [];
  }
}

export type HomeSliderProduct = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  images?: string[];
};

export async function getHomeSliderProducts(): Promise<HomeSliderProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, slug: true, name: true, description: true, images: true },
    });
    return rows
      .filter((p) => p.images && p.images.length > 0)
      .map((p) => ({
        id: p.id,
        slug: p.slug ?? undefined,
        name: p.name,
        description: p.description ?? undefined,
        images: p.images,
      }));
  } catch {
    return [];
  }
}

function mapDbProductToClient(p: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  images: string[];
  category: string;
  sizes: string[];
  colors: string[];
  stock: number;
  slug?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    currency: (['USD', 'EUR', 'COP'].includes(p.currency) ? p.currency : 'COP') as Product['currency'],
    imageUrl: p.imageUrl ?? p.images?.[0] ?? '',
    images: p.images ?? [],
    category: (isProductCategory(p.category) ? p.category : 'accesorios') as Product['category'],
    sizes: (p.sizes ?? []) as Product['sizes'],
    colors: p.colors ?? [],
    stock: p.stock ?? 0,
    slug: p.slug ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Lightweight catalog for home search suggestions (SSR). */
export async function getProductsForHomeSearch(): Promise<HomeSearchCatalogItem[]> {
  try {
    const rows = await prisma.product.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
    }));
  } catch {
    return [];
  }
}

export async function getFeaturedProductsForHome(limit = 8): Promise<Product[]> {
  try {
    const rows = await prisma.product.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        imageUrl: true,
        images: true,
        category: true,
        sizes: true,
        colors: true,
        stock: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows.map(mapDbProductToClient);
  } catch {
    return [];
  }
}

function serializeCombo(combo: {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number;
  currency: string;
  imageUrl: string | null;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  stock: number;
  soldCount: number;
  badge: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: number;
    productId: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
      currency: string;
      imageUrl: string | null;
      images: string[];
      category: string;
      stock: number;
      sku: string | null;
    };
  }>;
  surpriseGift: { id: number; hint: string | null; giftValue: number | null } | null;
}): Combo {
  return {
    ...combo,
    expiresAt: combo.expiresAt?.toISOString() ?? null,
    createdAt: combo.createdAt.toISOString(),
    updatedAt: combo.updatedAt.toISOString(),
    imageUrl: combo.imageUrl,
    images: combo.images ?? [],
    surpriseGift: combo.surpriseGift,
  };
}

const comboPublicInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          imageUrl: true,
          images: true,
          category: true,
          stock: true,
          sku: true,
        },
      },
    },
  },
  surpriseGift: {
    select: { id: true, hint: true, giftValue: true },
  },
} as const;

export async function getFeaturedCombosForHome(limit = 6): Promise<Combo[]> {
  try {
    let combos = await prisma.combo.findMany({
      where: { ...activeComboWhere(), isFeatured: true },
      include: comboPublicInclude,
      orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
    if (combos.length === 0) {
      combos = await prisma.combo.findMany({
        where: activeComboWhere(),
        include: comboPublicInclude,
        orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
        take: limit,
      });
    }
    return combos.map(serializeCombo);
  } catch {
    return [];
  }
}

export async function getActiveCombosList(): Promise<Combo[]> {
  try {
    const combos = await prisma.combo.findMany({
      where: activeComboWhere(),
      include: comboPublicInclude,
      orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }, { createdAt: 'desc' }],
    });
    return combos.map(serializeCombo);
  } catch {
    return [];
  }
}

export async function getComboBySlugForSeo(slug: string): Promise<Combo | null> {
  try {
    const combo = await prisma.combo.findUnique({
      where: { slug },
      include: comboPublicInclude,
    });
    if (!combo || !combo.isActive) return null;
    if (combo.expiresAt && combo.expiresAt < new Date()) return null;
    return serializeCombo(combo);
  } catch {
    return null;
  }
}

export async function getComboSlugsForSitemap(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  try {
    return await prisma.combo.findMany({
      where: activeComboWhere(),
      select: { slug: true, updatedAt: true },
    });
  } catch {
    return [];
  }
}

export async function getCatalogProducts(options: {
  limit?: number;
  category?: string;
}): Promise<{ products: Product[]; totalCount: number }> {
  const limit = options.limit ?? 24;
  const categoryFilter =
    options.category && isProductCategory(options.category)
      ? { category: options.category as (typeof PRODUCT_CATEGORIES)[number] }
      : {};

  try {
    const [rows, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: categoryFilter,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          imageUrl: true,
          images: true,
          category: true,
          sizes: true,
          colors: true,
          stock: true,
          createdAt: true,
          updatedAt: true,
          slug: true,
        },
      }),
      prisma.product.count({ where: categoryFilter }),
    ]);
    return { products: rows.map(mapDbProductToClient), totalCount };
  } catch {
    return { products: [], totalCount: 0 };
  }
}

export async function getProductSkusForSeo(id: string) {
  return prisma.product.findUnique({
    where: { id },
    select: { sku: true, brand: true },
  });
}

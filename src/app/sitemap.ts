import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { getBaseUrl } from '@/lib/site';
import { getComboSlugsForSitemap } from '@/lib/seo/queries';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';

export const revalidate = 3600; // regenerar cada hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1, lastModified: new Date() },
    { url: `${baseUrl}/products`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
    { url: `${baseUrl}/combos`, changeFrequency: 'daily', priority: 0.85, lastModified: new Date() },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6, lastModified: new Date() },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.6, lastModified: new Date() },
    { url: `${baseUrl}/seguimiento`, changeFrequency: 'monthly', priority: 0.5, lastModified: new Date() },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3, lastModified: new Date() },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3, lastModified: new Date() },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = PRODUCT_CATEGORIES.map((category) => ({
    url: `${baseUrl}/products/category/${category}`,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
    lastModified: new Date(),
  }));

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      select: { id: true, slug: true, updatedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    productRoutes = products.map((product) => ({
      url: `${baseUrl}/products/${product.slug ?? product.id}`,
      lastModified: product.updatedAt ?? product.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error generando sitemap de productos:', error);
  }

  let comboRoutes: MetadataRoute.Sitemap = [];
  try {
    const combos = await getComboSlugsForSitemap();
    comboRoutes = combos.map((combo) => ({
      url: `${baseUrl}/combos/${combo.slug}`,
      lastModified: combo.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));
  } catch (error) {
    console.error('Error generando sitemap de combos:', error);
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...comboRoutes];
}

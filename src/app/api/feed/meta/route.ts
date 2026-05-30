/**
 * GET /api/feed/meta
 *
 * Generates a Google Merchant / Meta Commerce Manager product feed (RSS 2.0 + g: namespace).
 * Meta reads this URL daily to keep the Facebook/Instagram catalog in sync.
 *
 * Register this URL in:
 *   Meta Commerce Manager → Catalog → Data Sources → Add data feed → Scheduled feed
 *   URL: https://www.motoservicioayr.com/api/feed/meta
 *
 * Docs: https://developers.facebook.com/docs/commerce-platform/catalog/feeds
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBaseUrl } from '@/lib/site';

/** Escape characters that would break XML */
function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const base = getBaseUrl();

  const products = await prisma.product.findMany({
    where: { stock: { gt: 0 } },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      images: true,
      sku: true,
      brand: true,
      tags: true,
      stock: true,
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const items = products
    .map((p) => {
      const mainImage = p.images?.[0] ?? p.imageUrl ?? '';
      if (!mainImage) return ''; // Meta requires at least one image

      const additionalImages = (p.images ?? [])
        .slice(1, 10) // Meta allows up to 10 additional images
        .map((img) => `      <g:additional_image_link>${xml(img)}</g:additional_image_link>`)
        .join('\n');

      // Use first tag as brand, fallback to store name
      const brand = p.brand?.trim()
        ? xml(p.brand.trim())
        : p.tags?.[0]
          ? xml(p.tags[0])
          : 'Motoservicio A&R';
      const productUrl = `${base}/products/${p.id}`;
      const priceFormatted = `${p.price.toFixed(2)} COP`;

      return `    <item>
      <g:id>${xml(p.sku ?? p.id)}</g:id>
      <g:title>${xml(p.name)}</g:title>
      <g:description>${xml(p.description)}</g:description>
      <g:link>${xml(productUrl)}</g:link>
      <g:image_link>${xml(mainImage)}</g:image_link>${additionalImages ? '\n' + additionalImages : ''}
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${p.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${priceFormatted}</g:price>
      <g:item_group_id>${xml(String(p.category))}</g:item_group_id>
    </item>`;
    })
    .filter(Boolean)
    .join('\n');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Motoservicio AyR</title>
    <link>${base}</link>
    <description>Repuestos y accesorios para motocicletas</description>
${items}
  </channel>
</rss>`;

  return new NextResponse(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Cache 1 hour — Meta only reads once per day anyway
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

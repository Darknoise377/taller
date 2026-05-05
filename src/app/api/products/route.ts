import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { isProductCategory, PRODUCT_CATEGORIES } from '@/constants/productCategories';
import { createAndStoreEmbedding } from '@/lib/embeddings';

function buildProductText(p: { name: string; description: string; sku?: string | null; tags?: string[]; diagramNumber?: string | null; category: string }): string {
  return [p.name, p.category, p.description, p.sku ? `SKU: ${p.sku}` : '', (p.tags ?? []).join(', '), p.diagramNumber ? `Diagrama: ${p.diagramNumber}` : ''].filter(Boolean).join(' | ');
}

// GET /api/products - Lista paginada de productos con filtros básicos
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '24')));
    const q = (url.searchParams.get('q') || '').trim();
    const category = url.searchParams.get('category') || '';
    const sort = url.searchParams.get('sort') || 'relevance';
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const size = url.searchParams.get('size');
    const color = url.searchParams.get('color');

    const where: Prisma.ProductWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ];
    }

    if (category && isProductCategory(category)) where.category = category;

    if (minPrice || maxPrice) {
      // Inicializamos como FloatFilter para asignar gte/lte correctamente
      where.price = {} as Prisma.FloatFilter;
      const priceFilter = where.price as Prisma.FloatFilter;
      if (minPrice && !Number.isNaN(Number(minPrice))) priceFilter.gte = Number(minPrice);
      if (maxPrice && !Number.isNaN(Number(maxPrice))) priceFilter.lte = Number(maxPrice);
    }

    if (size) {
      where.sizes = { has: size };
    }

    if (color) {
      where.colors = { has: color };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'price-asc'
        ? { price: 'asc' }
        : sort === 'price-desc'
        ? { price: 'desc' }
        : sort === 'newest'
        ? { createdAt: 'desc' }
        : { id: 'asc' };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          currency: true,
          imageUrl: true,
          images: true,
          sku: true,
          tags: true,
          diagramNumber: true,
          category: true,
          sizes: true,
          colors: true,
          stock: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/products - Crea un nuevo producto
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      price,
      currency,
      images,
      imageUrl,   // 👈 nuevo campo
      category,
      sizes,
      colors,
      stock,
      sku,
      tags,
      diagramNumber,
    } = body;

    // Validaciones
    if (
      !name ||
      !description ||
      typeof price !== 'number' ||
      !currency ||
      !category ||
      !isProductCategory(category) ||
      (sizes !== undefined && !Array.isArray(sizes)) ||
      (colors !== undefined && !Array.isArray(colors)) ||
      typeof stock !== 'number'
    ) {
      return NextResponse.json(
        { error: `Datos de producto inválidos o categoría no permitida. Categorías válidas: ${PRODUCT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Crear producto — construimos el objeto `data` evitando incluir
    // propiedades opcionales que no provengan del payload. Esto evita que
    // Prisma intente escribir columnas que no existen en la BD y reduce
    // errores P2022 en entornos sin migraciones aplicadas.
    const data: Prisma.ProductCreateInput = {
      name,
      description,
      price,
      currency,
      images: Array.isArray(images) ? images : [], // puede venir vacío si usas solo imageUrl
      imageUrl: imageUrl ?? null, // guardamos la URL de Cloudinary
      category,
      sizes: Array.isArray(sizes) ? sizes : [],
      colors: Array.isArray(colors) ? colors : [],
      stock: typeof stock === 'number' ? stock : 0,
    };

    // Añadimos tags solo si vienen explícitamente en el body. Esto evita que
    // Prisma intente escribir la columna cuando la migración no se ha aplicado
    // en el entorno (causa común de P2022).
    if (tags !== undefined) {
      data.tags = Array.isArray(tags) ? tags : [];
    }

    // Añadimos campos opcionales solo si vienen explícitamente en el body
    if (sku !== undefined) data.sku = sku;
    if (diagramNumber !== undefined) data.diagramNumber = diagramNumber ?? null;

    const product = await prisma.product.create({ data });

    // Indexar embedding de forma asíncrona (no bloquea la respuesta)
    void createAndStoreEmbedding({
      text: buildProductText({ name: product.name, description: product.description, sku: product.sku, tags: product.tags, diagramNumber: product.diagramNumber, category: product.category }),
      sourceType: 'product',
      sourceId: product.id,
    }).catch((e) => console.error('[embed] product create:', e));

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}

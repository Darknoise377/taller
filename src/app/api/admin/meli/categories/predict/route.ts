import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { prisma } from '@/lib/prisma';
import { meliApi, type MeliCategoryPrediction } from '@/lib/meli/client';
import { auditProductCategory } from '@/lib/meli/categoryAudit';
import { getMeliConfig } from '@/lib/meli/pricing';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await verifyAdminToken(token);
    return true;
  } catch {
    return false;
  }
}

export interface PredictedCategoryCandidate {
  domainId: string;
  domainName: string;
  categoryId: string;
  categoryName: string;
  path: string;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId es requerido' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { meliListing: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const config = await getMeliConfig();
    const tagsContext = product.tags?.join(' ') || '';
    const categoryContext = product.category ? String(product.category) : '';
    const brandContext = product.brand || '';

    // Enriched query for MeLi domain discovery
    const query = `Repuestos Motos y Cuatrimotos ${categoryContext} ${brandContext} ${product.name} ${tagsContext}`
      .trim()
      .replace(/\s+/g, ' ');

    let predictions: MeliCategoryPrediction[] = [];
    try {
      predictions = await meliApi.predictCategory(query);
    } catch (err) {
      console.warn('[meli/categories/predict] Domain discovery query error:', err);
    }

    // Resolve details for top predictions
    const candidates: PredictedCategoryCandidate[] = [];
    for (let i = 0; i < Math.min(predictions.length, 4); i++) {
      const pred = predictions[i];
      try {
        const catDetail = await meliApi.getCategory(pred.category_id);
        candidates.push({
          domainId: pred.domain_id,
          domainName: pred.domain_name,
          categoryId: pred.category_id,
          categoryName: pred.category_name,
          path: catDetail.path_from_root?.map((c) => c.name).join(' > ') ?? pred.category_name,
        });
      } catch {
        candidates.push({
          domainId: pred.domain_id,
          domainName: pred.domain_name,
          categoryId: pred.category_id,
          categoryName: pred.category_name,
          path: pred.category_name,
        });
      }
    }

    const currentAudit = auditProductCategory({
      productCategory: product.category,
      meliCategoryId: product.meliListing?.meliCategoryId,
      meliCategoryName: product.meliListing?.meliCategoryName,
      meliCategoryPath: product.meliListing?.meliCategoryPath,
      configuredCategoryId: config.categoryMap[String(product.category).toLowerCase()],
    });

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        currentListing: product.meliListing
          ? {
              meliItemId: product.meliListing.meliItemId,
              categoryId: product.meliListing.meliCategoryId,
              categoryName: product.meliListing.meliCategoryName,
              categoryPath: product.meliListing.meliCategoryPath,
            }
          : null,
      },
      audit: currentAudit,
      bestCandidate: candidates[0] || null,
      candidates,
    });
  } catch (err) {
    console.error('[meli/categories/predict] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al predecir categorías' },
      { status: 500 },
    );
  }
}

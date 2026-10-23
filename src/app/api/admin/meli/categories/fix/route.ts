import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { prisma } from '@/lib/prisma';
import { meliApi, type MeliItemPayload } from '@/lib/meli/client';
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

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { productId, newCategoryId, saveAsDefaultMapping } = body;

    if (!productId || !newCategoryId) {
      return NextResponse.json(
        { error: 'productId y newCategoryId son requeridos' },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { meliListing: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Fetch details of the new category
    const catDetail = await meliApi.getCategory(newCategoryId);
    const categoryName = catDetail.name ?? null;
    const categoryPath =
      catDetail.path_from_root?.map((c) => c.name).join(' > ') ?? categoryName;

    // Update listing in local database
    if (product.meliListing) {
      await prisma.meliListing.update({
        where: { productId },
        data: {
          meliCategoryId: newCategoryId,
          meliCategoryName: categoryName,
          meliCategoryPath: categoryPath,
          updatedAt: new Date(),
        },
      });
    }

    // If requested, also save this category as the default for this local product category
    if (saveAsDefaultMapping && product.category) {
      const config = await getMeliConfig();
      const updatedMap = {
        ...config.categoryMap,
        [String(product.category).toLowerCase()]: newCategoryId,
      };

      await prisma.meliConfig.update({
        where: { id: 1 },
        data: {
          categoryMap: updatedMap,
        },
      });
    }

    // If item is published in MeLi, attempt to update category_id in MeLi API (allowed if 0 bids/sales)
    let apiUpdateNotice: string | null = null;
    if (product.meliListing?.meliItemId) {
      try {
        await meliApi.updateItem(
          product.meliListing.meliItemId,
          { category_id: newCategoryId } as Partial<MeliItemPayload>,
        );
        apiUpdateNotice = 'Categoría actualizada exitosamente en Mercado Libre.';
      } catch {
        apiUpdateNotice =
          'Se actualizó en la base de datos local. En Mercado Libre la categoría no se puede modificar directamente si la publicación ya tiene visitas o ventas. Se aplicará al republicar.';
      }
    }

    return NextResponse.json({
      success: true,
      categoryId: newCategoryId,
      categoryName,
      categoryPath,
      notice: apiUpdateNotice,
    });
  } catch (err) {
    console.error('[meli/categories/fix] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al actualizar categoría' },
      { status: 500 },
    );
  }
}

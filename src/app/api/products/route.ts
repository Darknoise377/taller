import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isProductCategory, PRODUCT_CATEGORIES } from '@/constants/productCategories';

// GET /api/products - Lista todos los productos
export async function GET() {
  try {
    const products = await prisma.product.findMany({
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
      },
    });
    return NextResponse.json(products);
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
    } = body;

    // Validaciones
    if (
      !name ||
      !description ||
      typeof price !== 'number' ||
      !currency ||
      !category ||
      !isProductCategory(category) ||
      !Array.isArray(sizes) ||
      !Array.isArray(colors) ||
      typeof stock !== 'number'
    ) {
      return NextResponse.json(
        { error: `Datos de producto inválidos o categoría no permitida. Categorías válidas: ${PRODUCT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Crear producto
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        currency,
        images: images || [],   // puede venir vacío si usas solo imageUrl
        imageUrl: imageUrl || null, // 👈 guardamos la URL de Cloudinary
        category,
        sizes,
        colors,
        stock,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}

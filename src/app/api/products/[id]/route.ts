import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/products/[id] - Obtiene un producto por ID
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // ✅ await necesario
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
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
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT /api/products/[id] - Actualiza un producto
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // ✅ await necesario
  try {
    const body = await req.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Validaciones
    const price = typeof body.price === 'number' ? body.price : existingProduct.price;
    const stock = typeof body.stock === 'number' ? body.stock : existingProduct.stock;

    if (price < 0) {
      return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 });
    }
    if (stock < 0) {
      return NextResponse.json({ error: 'El stock no puede ser negativo' }, { status: 400 });
    }
    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: body.name ?? existingProduct.name,
        description: body.description ?? existingProduct.description,
        price,
        currency: body.currency ?? existingProduct.currency,
        images: Array.isArray(body.images) ? body.images : existingProduct.images,
        sku: body.sku ?? existingProduct.sku,
        tags: Array.isArray(body.tags) ? body.tags : existingProduct.tags,
        diagramNumber: body.diagramNumber ?? existingProduct.diagramNumber,
        category: body.category ?? existingProduct.category,
        sizes: Array.isArray(body.sizes) ? body.sizes : existingProduct.sizes,
        colors: Array.isArray(body.colors) ? body.colors : existingProduct.colors,
        stock,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Elimina un producto
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // ✅ await necesario
  try {
    const productId = Number(id);

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // ✅ Verificar si el producto está vinculado a alguna orden
    const linkedOrder = await prisma.orderProduct.findFirst({
      where: { productId },
    });

    if (linkedOrder) {
      return NextResponse.json(
        { error: '❌ No se puede eliminar el producto porque está asociado a una orden activa.' },
        { status: 400 }
      );
    }

    await prisma.product.delete({ where: { id: productId } });

    return NextResponse.json({
      message: `✅ Producto con ID ${id} eliminado correctamente`,
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}

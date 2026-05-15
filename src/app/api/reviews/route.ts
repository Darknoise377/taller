import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { COOKIE_NAME, CUSTOMER_COOKIE_NAME } from "@/config/admin";
import { verifyAdminToken, verifyCustomerToken } from "@/lib/auth/jwt";

async function isAdminRequest(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    await verifyAdminToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId")?.trim();

    if (!productId) {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 });
    }

    const admin = await isAdminRequest();

    const where = {
      productId,
      ...(admin ? {} : { approved: true }),
    };

    const reviews = await prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        comment: true,
        author: true,
        createdAt: true,
        approved: true,
        verifiedPurchase: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = await prisma.review.aggregate({
      where: { productId, approved: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    return NextResponse.json({
      reviews,
      stats: {
        average: stats?._avg?.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
        count: stats?._count?.id ?? 0,
      },
    });
  } catch (error) {
    console.error("Error cargando reseñas:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limit = await rateLimit(req, {
    keyPrefix: "reviews-create",
    windowMs: 60 * 60 * 1000,
    max: 3,
  });

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429 }
    );
  }

  try {
    // Require customer authentication
    const cookieStore = await cookies();
    const customerToken = cookieStore.get(CUSTOMER_COOKIE_NAME)?.value;

    if (!customerToken) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para dejar una reseña." },
        { status: 401 }
      );
    }

    let customerPayload;
    try {
      customerPayload = await verifyCustomerToken(customerToken);
    } catch {
      return NextResponse.json(
        { error: "Sesión inválida. Inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const productId = String(body?.productId ?? "").trim();
    const rating = Number(body?.rating ?? 0);
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (!productId || !Number.isFinite(rating)) {
      return NextResponse.json(
        { error: "Campos requeridos: productId, rating" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating debe ser entre 1 y 5" }, { status: 400 });
    }

    const exists = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    // Verify that the customer has purchased this product
    const purchaseOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { userId: customerPayload.uid },
          { customerEmail: customerPayload.sub },
        ],
        status: { in: ["APPROVED", "SHIPPED"] },
        products: {
          some: { productId },
        },
      },
      select: { id: true },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Solo puedes opinar sobre productos que has comprado." },
        { status: 403 }
      );
    }

    // Prevent duplicate reviews from the same customer for the same product
    const existing = await prisma.review.findFirst({
      where: {
        productId,
        email: customerPayload.sub,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya has dejado una reseña para este producto." },
        { status: 409 }
      );
    }

    const requireApproval = process.env.REVIEWS_REQUIRE_APPROVAL === "1";

    const created = await prisma.review.create({
      data: {
        productId,
        rating: Math.round(rating),
        comment: comment ? comment.slice(0, 500) : null,
        author: (customerPayload.name ?? customerPayload.sub).slice(0, 100),
        email: customerPayload.sub,
        approved: !requireApproval,
        verifiedPurchase: true,
      },
      select: { id: true, approved: true },
    });

    return NextResponse.json(
      {
        message: created.approved
          ? "Reseña publicada correctamente."
          : "Reseña enviada. Será visible tras aprobación.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando reseña:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME } from "@/config/admin";
import { verifyAdminToken } from "@/lib/auth";

/**
 * GET /api/admin/stats
 * Devuelve métricas y KPIs completos del dashboard:
 * - Ingresos totales, ingresos Wompi vs Contraentrega
 * - Conteo de órdenes por estado
 * - Inventario, productos críticos y stock bajo
 * - Órdenes recientes con canal de pago y datos de despacho
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await verifyAdminToken(token);

    const [
      totalOrders,
      pendingOrders,
      approvedOrders,
      shippedOrders,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalUsers,
      revenueResult,
      wompiRevenueResult,
      contraentregaOrdersCount,
      recentOrders,
      criticalStockProducts,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "APPROVED" } }),
      prisma.order.count({ where: { status: "SHIPPED" } }),
      prisma.product.count(),
      prisma.product.count({ where: { stock: { gt: 0, lte: 5 } } }),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.user.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { notIn: ["CANCELLED", "DECLINED"] } },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentMethod: "WOMPI", status: { notIn: ["CANCELLED", "DECLINED"] } },
      }),
      prisma.order.count({ where: { paymentMethod: "CONTRAENTREGA" } }),
      prisma.order.findMany({
        select: {
          id: true,
          referenceCode: true,
          customerName: true,
          total: true,
          status: true,
          paymentMethod: true,
          shippingCost: true,
          city: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.product.findMany({
        where: { stock: { lte: 5 } },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          imageUrl: true,
          category: true,
          sku: true,
        },
        orderBy: { stock: "asc" },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      approvedOrders,
      shippedOrders,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalRevenue: revenueResult._sum.total ?? 0,
      wompiRevenue: wompiRevenueResult._sum.total ?? 0,
      contraentregaOrdersCount,
      totalUsers,
      recentOrders,
      criticalStockProducts,
    });
  } catch (error) {
    console.error("Error cargando stats del dashboard:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

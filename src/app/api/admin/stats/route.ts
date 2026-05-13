import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME } from "@/config/admin";
import { verifyAdminToken } from "@/lib/auth";

/**
 * GET /api/admin/stats
 * Devuelve KPIs agregados del dashboard: ingresos totales, conteos, productos
 * con stock bajo y las 5 órdenes más recientes.
 * Solo accesible para usuarios autenticados.
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
      totalProducts,
      lowStockProducts,
      totalUsers,
      revenueResult,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.product.count(),
      prisma.product.count({ where: { stock: { lte: 5 } } }),
      prisma.user.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { notIn: ["CANCELLED", "DECLINED"] } },
      }),
      prisma.order.findMany({
        select: {
          id: true,
          referenceCode: true,
          customerName: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      totalProducts,
      lowStockProducts,
      totalRevenue: revenueResult._sum.total ?? 0,
      totalUsers,
      recentOrders,
    });
  } catch (error) {
    console.error("Error cargando stats del dashboard:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

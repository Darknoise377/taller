import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const action = (url.searchParams.get("action") || "").trim();

    const where = action ? { action } : {};

    const [items, total] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.securityAuditLog.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit }, { status: 200 });
  } catch (error) {
    console.error("Error listing security audit logs:", error);
    return NextResponse.json({ error: "Error listando auditoría de seguridad" }, { status: 500 });
  }
}

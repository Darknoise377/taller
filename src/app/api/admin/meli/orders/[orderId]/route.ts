import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/auth';
import { COOKIE_NAME } from '@/config/admin';
import { prisma } from '@/lib/prisma';
import { meliApi, type MeliShipmentResponse } from '@/lib/meli/client';
import type { MeliOrderItem } from '@/app/admin/meli/types';

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

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'ID de orden requerido' }, { status: 400 });
  }

  try {
    const order = await prisma.meliOrder.findUnique({
      where: { meliOrderId: orderId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            customerName: true,
            customerEmail: true,
            phone: true,
            address: true,
            city: true,
            department: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    const payload = (order.rawPayload || {}) as Record<string, unknown>;
    const shippingObj = payload?.shipping as { id?: number | string; receiver_address?: unknown } | undefined;
    const shipmentId = order.shipmentId || shippingObj?.id;

    let shipmentDetails: MeliShipmentResponse | null = null;
    let labelUrl: string | null = null;

    if (shipmentId) {
      try {
        shipmentDetails = await meliApi.getShipment(String(shipmentId));
      } catch (err) {
        console.warn(`[meli/orders/${orderId}] No se pudo obtener shipment ${shipmentId}:`, err);
      }

      try {
        const labelRes = await meliApi.getShipmentLabel(String(shipmentId));
        if (labelRes?.label_url) {
          labelUrl = labelRes.label_url;
        }
      } catch {
        // Label may not be available yet or not supported for this shipment type
      }
    }

    // Enrich order items with local product info (images, stock, base cost)
    const rawItems = (payload?.order_items || []) as Array<MeliOrderItem & {
      localProduct?: unknown;
      localCombo?: unknown;
    }>;
    const enrichedItems: typeof rawItems = [];

    for (const item of rawItems) {
      const meliItemId = item?.item?.id;
      let localProduct: unknown = null;
      let localCombo: unknown = null;

      if (meliItemId) {
        const listing = await prisma.meliListing.findFirst({
          where: { meliItemId: String(meliItemId) },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                price: true,
                cost: true,
                stock: true,
                sku: true,
              },
            },
            combo: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
                stock: true,
              },
            },
          },
        });

        if (listing?.product) localProduct = listing.product;
        if (listing?.combo) localCombo = listing.combo;
      }

      enrichedItems.push({
        ...item,
        localProduct,
        localCombo,
      });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        meliOrderId: order.meliOrderId,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        realCommission: order.realCommission,
        realShippingCost: order.realShippingCost,
        rawPayload: {
          ...payload,
          order_items: enrichedItems,
        },
        shipment: shipmentDetails,
        labelUrl,
        linkedStoreOrder: order.order,
      },
    });
  } catch (err) {
    console.error(`[meli/orders/${orderId}] Error al cargar detalle:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno al cargar orden' },
      { status: 500 },
    );
  }
}

// src/app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, OrderStatus } from "@prisma/client";
import { sendOrderStatusChangedEmail } from "@/lib/email/orderEmails";

/**
 * ✅ GET /api/orders/[id]
 * Obtiene una orden específica por su ID
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { products: { include: { product: true } } },
    });

    if (!order) {
      return NextResponse.json(
        { message: `Orden con ID ${id} no encontrada` },
        { status: 404 }
      );
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error(`❌ Error al obtener orden:`, error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * ✅ PATCH /api/orders/[id]
 * Actualiza parcialmente una orden (estado, datos de pago, etc.)
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    let previousOrderForEmail:
      | {
          referenceCode: string;
          customerName: string;
          customerEmail: string;
          total: number;
          currency: string;
          paymentMethod: "PAYU" | "CONTRAENTREGA" | "WOMPI";
          status: OrderStatus;
          products: { quantity: number; product: { name: string; price: number } }[];
        }
      | null = null;

    const dataToUpdate: Prisma.OrderUpdateInput = {};
    const {
      status,
      transactionId,
      paymentNetwork,
      rawResponse,
      customerName,
      customerEmail,
      address,
      city,
      department,
      postalCode,
      phone,
      cedula,
    } = body;

    // ✅ Validar el estado si viene en el body
    if (status) {
      if (!Object.values(OrderStatus).includes(status)) {
        return NextResponse.json(
          { message: `Estado '${status}' inválido` },
          { status: 400 }
        );
      }

      const existingOrder = await prisma.order.findUnique({
        where: { id: numericId },
        select: {
          referenceCode: true,
          customerName: true,
          customerEmail: true,
          total: true,
          currency: true,
          paymentMethod: true,
          status: true,
          products: {
            select: {
              quantity: true,
              product: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      });

      if (!existingOrder) {
        return NextResponse.json(
          { message: `Orden con ID ${id} no encontrada` },
          { status: 404 }
        );
      }

      previousOrderForEmail = existingOrder;
      dataToUpdate.status = status;
    }

    if (transactionId) dataToUpdate.transactionId = transactionId;
    if (paymentNetwork) dataToUpdate.paymentNetwork = paymentNetwork;
    if (rawResponse) dataToUpdate.rawResponse = rawResponse;
    if (typeof customerName === "string") dataToUpdate.customerName = customerName;
    if (typeof customerEmail === "string") dataToUpdate.customerEmail = customerEmail;
    if (typeof address === "string") dataToUpdate.address = address;
    if (typeof city === "string") dataToUpdate.city = city;
    if (typeof department === "string") dataToUpdate.department = department;
    if (typeof postalCode === "string") dataToUpdate.postalCode = postalCode;
    if (typeof phone === "string") dataToUpdate.phone = phone;
    if (typeof cedula === "string") dataToUpdate.cedula = cedula;

    const updatedOrder = await prisma.order.update({
      where: { id: numericId },
      data: dataToUpdate,
      include: { products: { include: { product: true } } },
    });

    if (
      previousOrderForEmail &&
      previousOrderForEmail.status !== updatedOrder.status
    ) {
      try {
        await sendOrderStatusChangedEmail({
          order: {
            ...previousOrderForEmail,
            status: updatedOrder.status,
          },
          previousStatus: previousOrderForEmail.status,
          newStatus: updatedOrder.status,
        });
      } catch (mailError) {
        console.error("Error enviando email de cambio de estado manual:", mailError);
      }
    }

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error(`❌ Error al actualizar orden:`, error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * ✅ DELETE /api/orders/[id]
 * Elimina una orden y sus productos asociados
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const deletedOrder = await prisma.$transaction(async (tx) => {
      const orderToDelete = await tx.order.findUnique({
        where: { id: Number(id) },
      });

      if (!orderToDelete) {
        throw new Error(`La orden ${id} no existe`);
      }

      // ✅ Eliminar productos asociados antes de la orden
      await tx.orderProduct.deleteMany({ where: { orderId: Number(id) } });
      await tx.order.delete({ where: { id: Number(id) } });

      return orderToDelete;
    });

    return NextResponse.json(
      {
        message: `Orden ${id} eliminada correctamente`,
        deleted: deletedOrder,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    if (message.includes("no existe")) {
      return NextResponse.json({ message }, { status: 404 });
    }
    console.error(`❌ Error al eliminar orden:`, error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}


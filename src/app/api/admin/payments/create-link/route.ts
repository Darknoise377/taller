import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/config/admin';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // 1. Verificar autenticación de administrador
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    await verifyAdminToken(token);

    // 2. Parsear el cuerpo de la petición
    const body = await req.json();
    const {
      productId,
      unitPrice,
      quantity,
      shippingCost,
      customerName,
      customerPhone,
      customerEmail,
      notes,
    } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    // 3. Buscar el producto en la base de datos
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        stock: true,
        imageUrl: true,
        images: true,
        sku: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const price = typeof unitPrice === 'number' && unitPrice > 0 ? unitPrice : product.price;
    const shipping = Math.max(0, Number(shippingCost) || 0);
    const total = price * qty + shipping;
    const currency = product.currency || 'COP';

    // Generar código de referencia único tipo AR-WA-XXXXX
    const referenceCode = `AR-WA-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const cleanPhone = (customerPhone || '').replace(/[^\d+]/g, '');

    // 4. Crear la orden en la base de datos (con status PENDING y método WOMPI)
    // Se permite crearla aunque stock sea 0 (para ventas de productos agotados o bajo pedido)
    const order = await prisma.order.create({
      data: {
        referenceCode,
        total,
        shippingCost: shipping,
        currency,
        status: 'PENDING',
        paymentMethod: 'WOMPI',
        customerName:
          customerName?.trim() ||
          (cleanPhone ? `Cliente WhatsApp (${cleanPhone})` : 'Venta WhatsApp / Directa'),
        customerEmail: customerEmail?.trim() || `whatsapp_${Date.now()}@tallerayr.com`,
        phone: cleanPhone || '3000000000',
        address: notes?.trim()
          ? `Venta WhatsApp: ${notes.trim()}`
          : 'Venta directa por WhatsApp - Coordinar entrega',
        city: 'Por coordinar',
        department: 'Colombia',
        products: {
          create: [
            {
              productId: product.id,
              quantity: qty,
              unitPrice: price,
            },
          ],
        },
      },
      select: {
        id: true,
        referenceCode: true,
        total: true,
        currency: true,
      },
    });

    // 5. Determinar la URL base del sitio
    const reqUrl = new URL(req.url);
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.trim() || `${reqUrl.protocol}//${reqUrl.host}`;

    // URL firmada directa usando el endpoint de redirección Wompi existente
    const directRedirectUrl = `${baseUrl}/api/wompi/redirect?ref=${order.referenceCode}`;

    // 6. Si se dispone de la clave privada de Wompi (WOMPI_PRIVATE_KEY), crear el enlace oficial en Wompi API
    let wompiApiLink: string | null = null;
    const privateKey = process.env.WOMPI_PRIVATE_KEY?.trim();

    if (privateKey) {
      try {
        const isTest = privateKey.startsWith('prv_test_');
        const wompiApiUrl = isTest
          ? 'https://sandbox.wompi.co/v1/payment_links'
          : 'https://production.wompi.co/v1/payment_links';

        const amountInCents = Math.round(total * 100);
        const redirectResponseUrl = new URL('/checkout/response', baseUrl);
        redirectResponseUrl.searchParams.set('referenceCode', order.referenceCode);
        redirectResponseUrl.searchParams.set('provider', 'wompi');

        const wompiRes = await fetch(wompiApiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${privateKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `Taller A&R - ${product.name}`,
            description: `Pago: ${product.name} (x${qty}) | Ref: ${order.referenceCode}`,
            single_use: true,
            currency: 'COP',
            amount_in_cents: amountInCents,
            redirect_url: redirectResponseUrl.toString(),
          }),
        });

        if (wompiRes.ok) {
          const wompiData = await wompiRes.json();
          const linkId = wompiData?.data?.id;
          if (linkId) {
            wompiApiLink = `https://checkout.wompi.co/l/${linkId}`;
          }
        } else {
          const errorTxt = await wompiRes.text();
          console.warn('Wompi API /v1/payment_links respuesta no-ok:', wompiRes.status, errorTxt);
        }
      } catch (wompiErr) {
        console.error('Error al contactar Wompi API payment_links:', wompiErr);
      }
    }

    // La URL final a compartir: si se creó el link oficial de Wompi se usa ese;
    // de lo contrario, se usa la URL firmada automática que ya funciona con WOMPI_PUBLIC_KEY
    const paymentUrl = wompiApiLink || directRedirectUrl;

    // 7. Preparar mensaje profesional para WhatsApp
    const formattedTotal = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(total);

    const formattedShipping =
      shipping > 0
        ? new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
          }).format(shipping)
        : null;

    const greeting = customerName?.trim() ? `¡Hola ${customerName.trim()}! 👋` : '¡Hola! 👋';
    const waMessage =
      `${greeting}\n` +
      `Te comparto tu enlace de pago seguro de *Motoservicio Taller A&R* 🏍️💨\n\n` +
      `📦 *Producto:* ${product.name}\n` +
      `🔢 *Cantidad:* ${qty}\n` +
      (formattedShipping ? `🚚 *Envío:* ${formattedShipping}\n` : '') +
      `💰 *Total a pagar:* ${formattedTotal} COP\n\n` +
      `👉 *Paga aquí de forma 100% segura (Wompi):*\n` +
      `${paymentUrl}\n\n` +
      `_(Acepta Nequi, PSE, Bancolombia y Tarjeta de Crédito/Débito)_\n` +
      `¡Quedamos muy atentos a tu confirmación para proceder con el alistamiento! 🙌`;

    return NextResponse.json({
      success: true,
      paymentUrl,
      wompiApiLink,
      directRedirectUrl,
      referenceCode: order.referenceCode,
      orderId: order.id,
      total,
      currency,
      waMessage,
      customerPhone: cleanPhone,
    });
  } catch (error) {
    console.error('Error al generar link de pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

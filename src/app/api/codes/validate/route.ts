import { NextRequest, NextResponse } from 'next/server';
import { prisma as db } from '@/lib/prisma'; // Importamos el cliente Prisma desde tu ruta existente
import { rateLimit } from '@/lib/rateLimit';

/**
 * API Route para validar un código de vendedor o promoción.
 * Busca en la tabla Seller y luego en la tabla Promotion.
 *
 * @param req NextRequest - Contiene el código en los search params (ej: /api/codes/validate?code=MI-CODIGO)
 */
export async function GET(req: NextRequest) {
  const limit = rateLimit(req, {
    keyPrefix: 'codes-validate',
    windowMs: 60 * 1000,
    max: 30,
  });

  if (!limit.ok) {
    return NextResponse.json(
      { type: 'invalid', message: 'Demasiados intentos. Intenta más tarde.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfterSeconds ?? 60),
          'X-RateLimit-Limit': String(limit.limit),
          'X-RateLimit-Remaining': String(limit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(limit.resetAt / 1000)),
        },
      }
    );
  }

  const { searchParams } = new URL(req.url);
  // Convertimos a mayúsculas para ser consistentes
  const code = searchParams.get('code')?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json(
      { type: 'invalid', message: 'El código es requerido.' },
      { status: 400 }
    );
  }

  try {
    // 1. Buscar primero como código de VENDEDOR
    const seller = await db.seller.findUnique({
      where: { code },
      select: { id: true, name: true, code: true }, // Solo seleccionamos lo necesario
    });

    if (seller) {
      // Encontrado como vendedor
      return NextResponse.json({ type: 'seller', data: seller });
    }

    // 2. Si no es vendedor, buscar como CÓDIGO PROMOCIONAL
    const promotion = await db.promotion.findUnique({
      where: {
        code,
        isActive: true, // ¡Importante! Asegúrate que la promo esté activa
      },
    });

    if (promotion) {
      // Encontrado como promoción
      // Opcional: Validar 'expiresAt' si existe
      if (promotion.expiresAt && new Date() > promotion.expiresAt) {
        return NextResponse.json(
          { type: 'invalid', message: 'Este código de promoción ha expirado.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ type: 'promotion', data: promotion });
    }

    // 3. Si no se encuentra en ninguna tabla, es inválido
    return NextResponse.json(
      { type: 'invalid', message: 'El código ingresado no es válido.' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error al validar el código:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
  
}
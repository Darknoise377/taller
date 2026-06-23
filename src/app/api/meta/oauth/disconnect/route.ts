import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { storeId } = await req.json();

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId es requerido' },
        { status: 400 }
      );
    }

    await prisma.metaToken.deleteMany({
      where: { storeId },
    });

    return NextResponse.json(
      { message: 'Conexión Meta revocada exitosamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
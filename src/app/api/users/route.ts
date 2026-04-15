import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/hash";

// 📍 GET → Listar todos los usuarios
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { error: "Error interno al listar usuarios" },
      { status: 500 }
    );
  }
}

// 📍 POST → Crear nuevo usuario
export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();

    // 🔎 Validaciones
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Los campos email, password y name son obligatorios" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    // Validar fortaleza de contraseña
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    // 🧩 Verificar si ya existe el usuario
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 409 } // 409 = conflicto
      );
    }

    // 🔒 Encriptar contraseña
    const hashedPassword = await hashPassword(password);

    // ✅ Crear nuevo usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || "VENDEDOR",
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    return NextResponse.json(
      {
        message: "Usuario creado correctamente",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "Error interno al crear usuario" },
      { status: 500 }
    );
  }
}

// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Usamos un tipo global para evitar múltiples instancias en dev con HMR
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'], // puedes usar ['query'] si quieres depurar
  })

// Guardamos la instancia globalmente para reutilizar conexiones y evitar saturar el pool de Supabase
globalForPrisma.prisma = prisma

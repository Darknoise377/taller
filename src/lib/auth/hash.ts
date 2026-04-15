// src/lib/auth/hash.ts
import bcrypt from "bcryptjs";

// Generar hash de una contraseña (por ejemplo para ADMIN_PASSWORD_HASH)
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verificar si una contraseña coincide con su hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// src/lib/auth/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { AdminRole, CustomerUser } from '@/types/auth';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const CUSTOMER_JWT_EXPIRES_IN = "30d";
let didWarnAboutJwtSecret = false;

function getSecretKey(): Uint8Array {
  const jwtSecretKey = process.env.JWT_SECRET;

  if (jwtSecretKey) {
    return new TextEncoder().encode(jwtSecretKey);
  }

  if (process.env.NODE_ENV !== 'production') {
    if (!didWarnAboutJwtSecret) {
      console.warn('JWT_SECRET no está configurado. Se usará una clave temporal solo para desarrollo local.');
      didWarnAboutJwtSecret = true;
    }

    return new TextEncoder().encode('local-dev-jwt-secret-ar-change-me');
  }

  throw new Error('Falta JWT_SECRET en variables de entorno');
}

function parseExpiresInToSeconds(expiresIn: string): number {
  const value = expiresIn.trim().toLowerCase();
  if (!value) return 60 * 60 * 24 * 7;

  // Plain seconds: "3600"
  if (/^\d+$/.test(value)) return Number(value);

  // Format: "15m", "12h", "7d", "30s"
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 60 * 60 * 24 * 7;

  const amount = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return 60 * 60 * 24 * 7;
  }
}

export function getJwtCookieMaxAgeSeconds(): number {
  return parseExpiresInToSeconds(JWT_EXPIRES_IN);
}

export function getCustomerJwtCookieMaxAgeSeconds(): number {
  return parseExpiresInToSeconds(CUSTOMER_JWT_EXPIRES_IN);
}

// ─── Admin tokens ───────────────────────────────────────────────────────────

export interface AdminTokenPayload extends JWTPayload {
  sub: string; // email
  uid: string; // userId (UUID)
  role: AdminRole;
  name?: string | null;
}

export async function signAdminToken(input: {
  email: string;
  userId: string;
  role: AdminRole;
  name?: string | null;
}): Promise<string> {
  const payload: AdminTokenPayload = {
    sub: input.email,
    uid: input.userId,
    role: input.role,
    name: input.name,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getSecretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify<AdminTokenPayload>(token, getSecretKey(), {
    algorithms: ["HS256"],
  });

  const validAdminRoles: AdminRole[] = ["ADMIN", "SUPERADMIN", "VENDEDOR"];
  if (!validAdminRoles.includes(payload.role)) {
    throw new Error("Token inválido: rol no autorizado");
  }

  if (typeof payload.uid !== 'string' || !payload.uid) {
    throw new Error('Token inválido: uid faltante');
  }

  return payload;
}

export async function refreshAdminToken(token: string): Promise<string | null> {
  try {
    const payload = await verifyAdminToken(token);
    const now = Math.floor(Date.now() / 1000);
    const expiration = payload.exp ?? 0;
    const lifetime = expiration - (payload.iat ?? 0);

    if (expiration - now < lifetime / 2) {
      return await signAdminToken({
        email: payload.sub,
        userId: payload.uid,
        role: payload.role,
        name: payload.name,
      });
    }
    return token;
  } catch {
    return null;
  }
}

// ─── Customer tokens ─────────────────────────────────────────────────────────

export interface CustomerTokenPayload extends JWTPayload {
  sub: string;  // email
  uid: string;  // userId (UUID)
  name?: string | null;
  tokenType: "customer";
}

export async function signCustomerToken(input: {
  email: string;
  userId: string;
  name?: string | null;
}): Promise<string> {
  const payload: CustomerTokenPayload = {
    sub: input.email,
    uid: input.userId,
    name: input.name,
    tokenType: "customer",
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(CUSTOMER_JWT_EXPIRES_IN)
    .sign(getSecretKey());
}

export async function verifyCustomerToken(token: string): Promise<CustomerTokenPayload> {
  const { payload } = await jwtVerify<CustomerTokenPayload>(token, getSecretKey(), {
    algorithms: ["HS256"],
  });

  if (payload.tokenType !== "customer") {
    throw new Error("Token inválido: tipo incorrecto");
  }

  if (typeof payload.uid !== 'string' || !payload.uid) {
    throw new Error('Token inválido: uid faltante');
  }

  return payload;
}

export function customerTokenPayloadToUser(payload: CustomerTokenPayload): CustomerUser {
  return { id: payload.uid, email: payload.sub, name: payload.name };
}

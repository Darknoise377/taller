import fs from "node:fs";
import path from "node:path";

import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/auth/hash";

function loadEnvFromDotenvFile(dotenvPath: string): void {
  if (!fs.existsSync(dotenvPath)) return;

  const content = fs.readFileSync(dotenvPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    // Strip inline comments (naive but OK for this project style)
    const hashIndex = value.indexOf("#");
    if (hashIndex !== -1) value = value.slice(0, hashIndex).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  // Carga .env para que Prisma tenga DATABASE_URL cuando ejecutas este script
  loadEnvFromDotenvFile(path.resolve(process.cwd(), ".env"));

  const email = process.env.ADMIN_EMAIL?.trim();
  const plainPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !plainPassword) {
    throw new Error(
      "ADMIN_EMAIL y ADMIN_PASSWORD son requeridos en el entorno. Revisa tu .env.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "No se encontró DATABASE_URL en el entorno. Revisa tu .env antes de ejecutar este script.",
    );
  }

  const hashed = await hashPassword(plainPassword);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "ADMIN",
      name: "Administrador",
    },
    create: {
      email,
      password: hashed,
      name: "Administrador",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin listo:", {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

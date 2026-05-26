// Crea el registro de vendedor para el Asistente Virtual de WhatsApp.
// Uso: node scripts/create-wa-seller.cjs
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.seller.findUnique({ where: { code: 'ASISTENTE_VIRTUAL' } });
  if (existing) {
    console.log('✅ El vendedor ASISTENTE_VIRTUAL ya existe:', existing);
    return;
  }

  const seller = await prisma.seller.create({
    data: {
      id: 'asistente-virtual-wa',
      name: 'Asistente Virtual WhatsApp',
      code: 'ASISTENTE_VIRTUAL',
    },
  });

  console.log('✅ Vendedor creado:', seller);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

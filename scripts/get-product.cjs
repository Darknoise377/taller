require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product
  .findFirst({ where: { stock: { gt: 0 } }, select: { id: true, name: true, price: true, stock: true } })
  .then((p) => { console.log(JSON.stringify(p)); return prisma.$disconnect(); })
  .catch((e) => { console.error(e.message); prisma.$disconnect(); });

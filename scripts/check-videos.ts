import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      videoUrl: true,
    }
  });

  console.log('--- Database videoUrl check ---');
  products.forEach(p => {
    console.log(`Product: "${p.name}" (ID: ${p.id})`);
    console.log(`  videoUrl: ${JSON.stringify(p.videoUrl)} (type: ${typeof p.videoUrl})`);
  });
  console.log('-------------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

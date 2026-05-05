/**
 * ingest-embeddings.ts
 * Genera embeddings para todos los productos y los almacena en la tabla Embedding.
 *
 * Uso:
 *   npx tsx src/scripts/ingest-embeddings.ts
 *   npx tsx src/scripts/ingest-embeddings.ts --force   # re-genera aunque ya existan
 */

import { config } from 'dotenv';
import { resolve } from 'path';
// Carga .env y luego .env.local (mismo orden que Next.js — local sobreescribe)
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

// Para scripts standalone usamos DIRECT_URL (port 5432) en vez del pooler pgbouncer (6543)
// porque $executeRawUnsafe no funciona correctamente sobre pgbouncer.
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
import { prisma } from '../lib/prisma';
import { createAndStoreEmbedding } from '../lib/embeddings';

const FORCE = process.argv.includes('--force');
const BATCH_SIZE = 10; // productos por lote (evita saturar la API)
const DELAY_MS = 500;  // pausa entre lotes

function buildProductText(p: {
  name: string;
  description: string;
  sku: string | null;
  tags: string[];
  diagramNumber: string | null;
  category: string;
}): string {
  const parts = [
    p.name,
    p.category,
    p.description,
    p.sku ? `SKU: ${p.sku}` : '',
    p.tags.length ? p.tags.join(', ') : '',
    p.diagramNumber ? `Diagrama: ${p.diagramNumber}` : '',
  ].filter(Boolean);
  return parts.join(' | ');
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      tags: true,
      diagramNumber: true,
      category: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Total productos: ${products.length}`);

  // Filtrar los que ya tienen embedding (a menos que --force)
  let toProcess = products;
  if (!FORCE) {
    const existing = await prisma.embedding.findMany({
      where: { sourceType: 'product' },
      select: { sourceId: true },
    });
    const existingIds = new Set(existing.map((e) => e.sourceId));
    toProcess = products.filter((p) => !existingIds.has(p.id));
    console.log(`Ya indexados: ${existing.length} | Pendientes: ${toProcess.length}`);
  }

  if (toProcess.length === 0) {
    console.log('Nada que procesar. Usa --force para re-generar todo.');
    await prisma.$disconnect();
    return;
  }

  let ok = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (product) => {
        const text = buildProductText(product);
        try {
          const result = await createAndStoreEmbedding({
            text,
            sourceType: 'product',
            sourceId: product.id,
          });
          if (result) {
            ok++;
            process.stdout.write(`✓ [${product.id}] ${product.name.slice(0, 40)}\n`);
          } else {
            errors++;
            process.stdout.write(`✗ [${product.id}] sin proveedor de embeddings disponible\n`);
          }
        } catch (err) {
          errors++;
          const msg = err instanceof Error ? err.message : String(err);
          process.stdout.write(`✗ [${product.id}] error: ${msg}\n`);
        }
      })
    );

    // Pausa entre lotes para no saturar la API
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\nFinalizado — OK: ${ok} | Errores: ${errors}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

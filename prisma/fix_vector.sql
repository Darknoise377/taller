BEGIN;

-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- If the project DB is empty or you accept data loss in the Embedding.vector column,
-- drop the existing column and recreate it using the desired vector type.
ALTER TABLE "Embedding" DROP COLUMN IF EXISTS "vector";
ALTER TABLE "Embedding" ADD COLUMN "vector" vector(768);

COMMIT;

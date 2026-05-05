-- ─────────────────────────────────────────────────────────────────────────────
-- fix_vector.sql
-- Ejecutar UNA VEZ en Supabase > SQL Editor
-- Convierte Embedding.vector de JSONB a vector(768) para pgvector.
-- text-embedding-004 (Vertex AI) produce vectores de 768 dimensiones.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Habilitar extensión pgvector (ya viene en Supabase, idempotente)
CREATE EXTENSION IF NOT EXISTS vector;

-- Reemplazar columna JSONB por vector nativo
-- NOTA: esto borra los datos existentes en la columna (no hay embeddings aún)
ALTER TABLE "Embedding" DROP COLUMN IF EXISTS "vector";
ALTER TABLE "Embedding" ADD COLUMN "vector" vector(768);

-- Índice IVFFLAT para búsqueda por similitud coseno (eficiente con >1000 filas)
-- Si la tabla está vacía, se puede crear ahora; si tiene datos, se crea automáticamente
CREATE INDEX IF NOT EXISTS "embedding_vector_idx"
  ON "Embedding" USING ivfflat ("vector" vector_cosine_ops)
  WITH (lists = 100);

COMMIT;

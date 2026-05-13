-- Create StoreSettings singleton table and seed with default shipping rules
CREATE TABLE IF NOT EXISTS "StoreSettings" (
  "id"            INTEGER NOT NULL DEFAULT 1,
  "shippingRules" JSONB   NOT NULL,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default row (upsert so re-running is safe)
INSERT INTO "StoreSettings" ("id", "shippingRules", "updatedAt")
VALUES (
  1,
  '{
    "freeShippingAll": false,
    "freeShippingThreshold": 200000,
    "contraentregaSurcharge": 8000,
    "regions": [
      { "label": "Bogotá D.C.",    "baseRate": 9000,  "departments": ["Bogotá D.C."] },
      { "label": "Cundinamarca",   "baseRate": 11000, "departments": ["Cundinamarca"] },
      { "label": "Antioquia",      "baseRate": 12000, "departments": ["Antioquia"] },
      { "label": "Eje Cafetero",   "baseRate": 12000, "departments": ["Caldas", "Quindío", "Risaralda"] },
      { "label": "Valle del Cauca","baseRate": 13000, "departments": ["Valle del Cauca"] },
      { "label": "Santanderes",    "baseRate": 13000, "departments": ["Santander", "Norte de Santander"] },
      { "label": "Atlántico",      "baseRate": 14000, "departments": ["Atlántico"] },
      { "label": "Centro",         "baseRate": 14000, "departments": ["Boyacá", "Huila", "Tolima"] },
      { "label": "Costa Caribe",   "baseRate": 16000, "departments": ["Bolívar", "Cesar", "Córdoba", "La Guajira", "Magdalena", "Sucre", "San Andrés y Providencia"] },
      { "label": "Llanos / Meta",  "baseRate": 17000, "departments": ["Meta", "Casanare", "Arauca"] },
      { "label": "Sur del país",   "baseRate": 19000, "departments": ["Cauca", "Nariño", "Putumayo", "Caquetá"] },
      { "label": "Amazonía / Pacífico", "baseRate": 28000, "departments": ["Amazonas", "Guainía", "Guaviare", "Vaupés", "Vichada", "Chocó"] }
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

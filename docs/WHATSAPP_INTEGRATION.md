WhatsApp + IA integration (Cloud API)
===================================

Resumen rápido
--------------
- Recomendado: usar WhatsApp Cloud API (Meta) para producción.
- Alternativa: librerías no oficiales (whatsapp-web.js / Baileys) para prototipos.
- Flujo: Webhook -> Server (Next.js) -> IA (Gemini/OpenAI) -> WhatsApp API response.

Archivos añadidos
-----------------
- [src/app/api/webhook/route.ts](src/app/api/webhook/route.ts#L1): webhook handler (GET verify + POST messages).
- [src/lib/ai.ts](src/lib/ai.ts#L1): simple AI wrapper (supports OpenAI; optional Gemini via @google/genai).

Variables de entorno necesarias
-----------------------------
- `WHATSAPP_VERIFY_TOKEN` = token que configuras en Meta para verificar el webhook (secreto simple).
- `WHATSAPP_API_TOKEN` = access token (Meta) para enviar mensajes (no lo expongas públicamente).
- `WHATSAPP_PHONE_ID` = el ID del número (Phone Number ID) de Meta/WhatsApp Cloud.
- `WHATSAPP_GRAPH_API_VERSION` = opcional, por defecto `v17.0`.
- `WA_AI_SYSTEM_PROMPT` = prompt sistema para la IA (opcional).
- `OPENAI_API_KEY` = para usar OpenAI (fallback). `OPENAI_MODEL` opcional.
- `GEMINI_API_KEY` = para usar Google GenAI (opcional). `GEMINI_MODEL` opcional.

Desarrollo y pruebas
---------------------
1. Levanta tu app local (`npm run dev`).
2. Usa `ngrok http 3000` y copia la URL pública.
3. En Meta for Developers, configura el webhook con la ruta pública: `https://<ngrok>/api/webhook`.
4. Meta hará una verificación GET, tu `WHATSAPP_VERIFY_TOKEN` debe coincidir.
5. Envía un mensaje al número y revisa logs (Vercel logs o la consola local) para ver el procesamiento.

Persistencia / Memoria
----------------------
- Para mantener contexto entre mensajes, guarda el historial (por `wa_id`) en una tabla y pásalo al proveedor IA en cada llamada.
- En `route.ts` hay un lugar marcado para `history` — implementa tu almacenamiento con `prisma`/Supabase.

Consideraciones de producción
-----------------------------
- Maneja límites y errores de la API de WhatsApp (reintentos exponenciales).
- Respeta las políticas de WhatsApp (mensajes plantilla vs. free-form, límites diarios).
- Si usas Google GenAI vía servicio, sigue las recomendaciones de autenticación (service account o API key según el SDK).

¿Deseas que implemente la persistencia (Prisma) y ejemplos de plantillas (interactive messages)?

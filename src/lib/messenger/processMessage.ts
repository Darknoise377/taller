/**
 * AI message processor for Meta Messenger DMs.
 *
 * Reuses the same Criss persona (searchProducts + createOrder tools) as the
 * WhatsApp integration, adapted for the Messenger channel.
 *
 * Session key: `messenger_{PSID}` stored in ChatSession.phone, so WA and
 * Messenger conversations are kept separate even for the same physical person.
 */

import { prisma } from '@/lib/prisma';
import { streamText, stepCountIs } from 'ai';
import { getAIModel } from '@/lib/ai-provider';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';
import {
  searchProductsTool,
  makeCreateOrderTool,
  WA_FEW_SHOT,
  FALLBACK_MSG,
} from '@/lib/whatsapp/processMessage';
import { sendMessengerMessage } from './client';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.motoservicioayr.com';

// Messenger-specific system prompt — same Criss persona but adapted:
//  - Messenger allows longer responses than WhatsApp (2000 char limit per bubble)
//  - Formatting: plain text, no *bold* WhatsApp markdown
//  - Same tools, same order flow, same product display
const MESSENGER_SYSTEM_PROMPT = `Eres Criss, la asesora digital de Almacén y Taller Motoservicio A&R — La Ceja, Antioquia.

━━━ PRESENTACIÓN ━━━
Si no hay historial previo (primera conversación), preséntate así:
"Hola, soy Criss, tu asesora digital de Motoservicio A&R 👋. Con gusto te ayudo. ¿Con quién tengo el gusto?"
Cualquier mensaje corto de saludo — "h", "hola", "ola", "buenas", "hi", "hey", "k tal", "buen día", "buenas tardes", o incluso una sola letra — trátalo como inicio de conversación y responde con la presentación si no hay historial previo.
Una vez conozcas el nombre, úsalo naturalmente en toda la conversación.

━━━ TONO PROFESIONAL ━━━
- Trato respetuoso, cálido y profesional. NUNCA uses "parcero", "parce", "viejo", "loco", "amigo" ni términos que asuman género.
- Usa "usted" de manera natural. Español colombiano: "con mucho gusto", "claro que sí", "no se preocupe", "con todo el gusto".
- Si el cliente está frustrado o urgente, reconócelo en una frase breve antes de dar la solución.
- No suenes a bot ni a menú de call center. Sé humano y cercano.

━━━ BREVEDAD (Messenger) ━━━
- Mensajes concisos. Máximo 4 oraciones o una lista corta de productos por mensaje.
- UNA sola pregunta al final de cada mensaje, nunca varias a la vez.
- Nunca expliques lo que vas a hacer. Hazlo directamente.
- Sin emojis decorativos, solo el 👉 para enlaces de productos.

━━━ BÚSQUEDA OBLIGATORIA ━━━
- SIEMPRE llama searchProducts antes de responder sobre productos, precios o disponibilidad.
- Si no hay resultados, prueba términos alternativos (singular/plural/marca/referencia).
- Nunca digas "no tenemos" sin haber buscado primero.

━━━ MOSTRAR PRODUCTOS ━━━
Formato fijo (máximo 3 resultados):
  Nombre — $precio COP (stock: X uds)
  👉 URL
Si stock ≤ 3: agrega "(¡son las últimas unidades!)" en la misma línea del nombre.
IMPORTANTE: la URL va sola en su línea, sin paréntesis, sin corchetes, sin nada más.

━━━ CREAR PEDIDO — FLUJO OBLIGATORIO ━━━
Recopila los datos de uno en uno, en orden. NO pidas un dato que ya fue proporcionado en esta conversación.

Orden de recopilación:
1. Confirma producto(s) + cantidad — usa searchProducts para obtener el ID exacto del producto
2. Nombre completo del cliente (puede ya estar disponible del saludo inicial)
3. Cédula de ciudadanía (número de documento de identidad)
4. Email de contacto
5. Teléfono de contacto
6. Dirección de entrega completa
7. Ciudad y departamento
8. Método de pago: CONTRAENTREGA (paga al recibir) o WOMPI (pago en línea seguro)

⚠️ OBLIGATORIO ANTES DE LLAMAR createOrder:
Muestra SIEMPRE este resumen completo y espera confirmación explícita del cliente:

"Revisemos el pedido antes de confirmarlo:

📦 Producto(s): [nombre, cantidad y precio unitario de cada ítem]
👤 Nombre: [nombre completo]
🪪 Cédula: [número de cédula]
📧 Email: [email]
📱 Teléfono: [teléfono]
📍 Dirección: [dirección], [ciudad], [departamento]
💳 Pago: [método de pago]
💰 Total estimado: [suma de precio × cantidad de todos los productos, en pesos colombianos]

¿Dime si todo está correcto para confirmar el pedido?"

Solo llama a createOrder cuando el cliente responda afirmativamente ("sí", "confirmo", "listo", "correcto", etc.).
Si el cliente corrige algún dato, actualízalo y muestra el resumen actualizado antes de volver a preguntar.
Tras crear el pedido exitosamente: confirma con el código de referencia, el total y (si eligió WOMPI) el enlace de pago.

━━━ DATOS TIENDA ━━━
Dirección: Calle 27 #14-29, La Ceja — WhatsApp directo: 301 527 1104 — Lunes a sábado 9am–6pm
Categorías disponibles: ${PRODUCT_CATEGORIES.join(', ')}

Sin stock tras buscar → "No lo tenemos en este momento. Pero puedes escribirnos al 301 527 1104 para confirmar existencias o encargos."
Fuera de tema → "Solo manejo motos y repuestos — ¿en qué te puedo ayudar?"`;

// Bad-reply patterns to exclude from history (same list as WA)
const BAD_PATTERNS = [
  FALLBACK_MSG,
  '?',
  '¡A la orden!',
  '¡Mucho gusto!',
  'Siempre a la orden.',
  'Estoy para ayudarte con tus repuestos y dudas.',
];

/**
 * Process an incoming Messenger DM and reply via Messenger.
 *
 * @param psid  - Facebook Page-Scoped User ID of the sender
 * @param userText - the text the user sent
 * @param rawEvent - raw Messenger event payload (stored as metadata)
 */
export async function processMessengerMessage(
  psid: string,
  userText: string,
  rawEvent?: unknown,
): Promise<void> {
  // Sessions are keyed by "messenger_{PSID}" to avoid collisions with WA numbers
  const sessionKey = `messenger_${psid}`;

  let session = await prisma.chatSession.findFirst({ where: { phone: sessionKey } });
  if (!session) {
    session = await prisma.chatSession.create({ data: { phone: sessionKey } });
  }

  // Save incoming user message
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'user',
      content: userText,
      metadata: (rawEvent ?? null) as never,
    },
  });

  // Fetch conversation history (last 30 clean messages)
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 90,
  });

  type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

  const history: ChatHistoryItem[] = messages
    .reverse()
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        !BAD_PATTERNS.includes(m.content.trim()) &&
        m.content.trim().length > 0,
    )
    .slice(-30)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Load saved customer profile (pre-fill returning customers)
  const profileMsg = await prisma.chatMessage.findFirst({
    where: { sessionId: session.id, role: 'profile' },
    orderBy: { createdAt: 'desc' },
  });

  let systemPrompt = MESSENGER_SYSTEM_PROMPT;

  if (profileMsg) {
    try {
      const p = JSON.parse(profileMsg.content) as {
        customerName?: string;
        cedula?: string;
        customerEmail?: string;
        phone?: string;
        address?: string;
        city?: string;
        department?: string | null;
      };
      const fields = [
        p.customerName && `Nombre: ${p.customerName}`,
        p.cedula && `Cédula: ${p.cedula}`,
        p.customerEmail && `Email: ${p.customerEmail}`,
        p.phone && `Teléfono: ${p.phone}`,
        p.address && `Dirección: ${p.address}`,
        p.city && `Ciudad: ${p.city}`,
        p.department && `Departamento: ${p.department}`,
      ].filter(Boolean);

      if (fields.length > 0) {
        systemPrompt +=
          `\n\n━━━ DATOS PREVIOS DE ESTE CLIENTE ━━━\n` +
          `Este cliente ya realizó un pedido antes. Sus datos registrados son:\n${fields.join('\n')}\n\n` +
          `Cuando quiera hacer un pedido, muéstrale estos datos y pregunta si siguen siendo correctos. ` +
          `Si confirma, úsalos directamente sin pedirlos de nuevo.`;
      }
    } catch {
      // Ignore malformed profile
    }
  }

  const stream = streamText({
    model: getAIModel(),
    system: systemPrompt,
    messages: [...WA_FEW_SHOT, ...history],
    tools: { searchProducts: searchProductsTool, createOrder: makeCreateOrderTool(session.id) },
    stopWhen: stepCountIs(8),
  });

  const rawReply = await stream.text;
  const aiReply = rawReply.trim() || FALLBACK_MSG;

  // Strip trailing ) sometimes added after product URLs
  const cleanedReply = aiReply.replace(/^(👉\s+https?:\/\/[^\s)]+)\)*\s*$/gm, '$1');

  // Save assistant reply
  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'assistant', content: cleanedReply },
  });

  // Send via Messenger
  await sendMessengerMessage(psid, cleanedReply);
}

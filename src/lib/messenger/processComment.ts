/**
 * AI handler for public Facebook post comments.
 *
 * Strategy: Reply publicly and briefly to the comment — acknowledge the
 * interest, answer if possible, and invite them to continue via DM.
 * This follows best practice for Facebook comment management.
 *
 * For the AI reply we use a simpler prompt (no order flow, no tools)
 * to keep replies short and professional for the public feed.
 */

import { generateText } from 'ai';
import { getAIModel } from '@/lib/ai-provider';
import { replyToFbComment } from './client';
import { PRODUCT_CATEGORIES } from '@/constants/productCategories';

const COMMENT_SYSTEM_PROMPT = `Eres Criss, la asesora digital de Almacén y Taller Motoservicio A&R — La Ceja, Antioquia.

Vas a responder un comentario público en la página de Facebook de la tienda.

Reglas ESTRICTAS:
- Máximo 2 oraciones. La respuesta debe ser MUY corta (menos de 200 caracteres idealmente).
- Tono cálido, profesional y colombiano ("con mucho gusto", "claro que sí").
- Usa "usted".
- Si preguntan por un producto, precio o disponibilidad: confirma que se puede ayudar y pide que envíen mensaje privado para dar detalles.
- Si es un comentario positivo o agradecimiento: responde brevemente y agradece.
- Si es una queja o reclamo: reconoce con empatía y pide que escriban por DM para gestionar.
- Si es spam o irrelevante: no respondas (devuelve la cadena vacía "").
- NUNCA menciones precios, stock ni datos concretos en un comentario público.
- NUNCA uses saludo inicial largo. Ve directo y brevemente.
- Fin de mensaje: invita a escribir por mensaje privado si aplica.

Categorías de la tienda: ${PRODUCT_CATEGORIES.join(', ')}
Horario: Lunes a sábado 9am–6pm. WhatsApp: 301 527 1104. La Ceja, Antioquia.`;

/**
 * Process a Facebook post comment and post a public AI reply.
 *
 * @param commentId  - Facebook comment ID (used to post the reply)
 * @param commentText - the text of the comment
 * @param authorName  - public name of the commenter (used in reply context)
 */
export async function processFbComment(
  commentId: string,
  commentText: string,
  authorName?: string,
): Promise<void> {
  if (!commentText?.trim()) return;

  const userContext = authorName
    ? `Comentario de "${authorName}": ${commentText}`
    : commentText;

  let reply: string;

  try {
    const result = await generateText({
      model: getAIModel(),
      system: COMMENT_SYSTEM_PROMPT,
      prompt: userContext,
    });

    reply = result.text?.trim() ?? '';
  } catch (err) {
    console.error('[FB Comment AI] generateText failed:', err);
    return; // Don't reply with an error message on a public comment
  }

  // Empty string means the AI decided not to reply (spam / irrelevant)
  if (!reply) {
    console.log(`[FB Comment] AI chose not to reply to comment ${commentId}`);
    return;
  }

  try {
    await replyToFbComment(commentId, reply);
  } catch (err) {
    console.error('[FB Comment] replyToFbComment failed:', err);
  }
}

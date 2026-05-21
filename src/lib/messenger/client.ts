/**
 * Meta Messenger + Facebook Graph API client helpers.
 *
 * Required env vars:
 *   MESSENGER_PAGE_ACCESS_TOKEN  — long-lived page token (never expires if rotated properly)
 *   MESSENGER_GRAPH_API_VERSION  — optional, defaults to v21.0
 */

const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
const GRAPH_API_VERSION = process.env.MESSENGER_GRAPH_API_VERSION ?? 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ── Send a private Messenger message to a user (PSID) ────────────────────────

export async function sendMessengerMessage(recipientPsid: string, text: string): Promise<void> {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn('[Messenger] MESSENGER_PAGE_ACCESS_TOKEN not configured — skipping send');
    return;
  }

  // Messenger caps a single text message at 2000 chars; split if needed
  const chunks = splitText(text, 2000);

  for (const chunk of chunks) {
    const res = await fetch(`${GRAPH_BASE}/me/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text: chunk },
        messaging_type: 'RESPONSE',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[Messenger] sendMessage failed: ${res.status} ${body}`);
    }
  }
}

// ── Reply to a Facebook post comment ─────────────────────────────────────────
// Posts a public reply under the given comment.

export async function replyToFbComment(commentId: string, message: string): Promise<void> {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn('[Messenger] MESSENGER_PAGE_ACCESS_TOKEN not configured — skipping comment reply');
    return;
  }

  // Facebook comment replies are capped at 8000 chars, but keep them short
  const text = message.slice(0, 500);

  const res = await fetch(`${GRAPH_BASE}/${commentId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[Messenger] replyToComment failed: ${res.status} ${body}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function splitText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Try to split on a newline or space boundary
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt < maxLength * 0.5) splitAt = remaining.lastIndexOf(' ', maxLength);
    if (splitAt <= 0) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

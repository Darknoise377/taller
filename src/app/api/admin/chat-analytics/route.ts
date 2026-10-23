import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIStatus } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

const CAUSE_PATTERNS: Array<{ label: string; test: (m: string) => boolean }> = [
  { label: 'Producto sin stock', test: (m) => /no (lo )?tenemos|no hay|sin stock|agotado/.test(m) },
  { label: 'Error técnico del asistente', test: (m) => /tuve un problema|procesando tu mensaje|interrupci[oó]n/.test(m) },
  { label: 'Consulta fuera de tema', test: (m) => /solo manejo motos|solo manejo/.test(m) },
  { label: 'Abandonó al pedir datos del pedido', test: (m) => /c[eé]dula|direcci[oó]n|ciudad|departamento|email|correo|tel[eé]fono/.test(m) },
  { label: 'Consultó precio pero no compró', test: (m) => /\$\s*[\d.]|precio|valor/.test(m) },
  { label: 'Consultó producto pero no compró', test: (m) => /disponible|tenemos|kit|repuesto|pastilla|aceite|filtro|llanta|freno/.test(m) },
  { label: 'Abandonó en saludo inicial', test: (m) => /con qui[eé]n tengo|cu[aá]l es tu nombre|en qu[eé] te puedo ayudar/.test(m) },
];

function classifyAbandonCause(lastAssistantMsg?: string): string {
  if (!lastAssistantMsg) return 'Sin respuesta del asistente';
  const lower = lastAssistantMsg.toLowerCase();
  for (const { label, test } of CAUSE_PATTERNS) {
    if (test(lower)) return label;
  }
  return 'Razón no identificada';
}

export type SessionDetail = {
  id: number;
  phone: string;
  userId: string | null;
  source: 'whatsapp' | 'meta_messenger' | 'web_assistant' | 'unknown';
  status: 'converted' | 'in_progress' | 'abandoned';
  messageCount: number;
  lastActivity: string;
  hoursSinceLastMsg: number;
  possibleCause: string;
  lastMessages: Array<{ role: string; content: string; createdAt: string }>;
  allMessages: Array<{ id: number; role: string; content: string; createdAt: string }>;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get('days') ?? '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Diagnostic health status
  const aiHealth = getAIStatus();
  const whatsappConfigured = Boolean(
    process.env.WHATSAPP_API_TOKEN &&
    !process.env.WHATSAPP_API_TOKEN.startsWith('replace_') &&
    process.env.WHATSAPP_PHONE_ID
  );
  let waApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? 'v21.0';
  if (waApiVersion === 'v17.0' || waApiVersion === 'v18.0') {
    waApiVersion = 'v21.0 (auto-actualizado)';
  }

  const systemHealth = {
    ai: aiHealth,
    whatsapp: {
      configured: whatsappConfigured,
      phoneId: process.env.WHATSAPP_PHONE_ID ?? null,
      apiVersion: waApiVersion,
      hasSecret: Boolean(
        (process.env.WHATSAPP_APP_SECRET && !process.env.WHATSAPP_APP_SECRET.startsWith('replace_')) ||
        (process.env.META_APP_SECRET && !process.env.META_APP_SECRET.startsWith('replace_'))
      ),
      hasToken: Boolean(process.env.WHATSAPP_API_TOKEN && !process.env.WHATSAPP_API_TOKEN.startsWith('replace_')),
    },
  };

  // Sessions in the period
  const sessions = await prisma.chatSession.findMany({
    where: { createdAt: { gte: since } },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = Date.now();

  function classifySessionSource(session: { phone: string | null; userId: string | null }): SessionDetail['source'] {
    if (session.phone?.startsWith('messenger_')) return 'meta_messenger';
    if (session.phone) return 'whatsapp';
    if (session.userId?.startsWith('ip:')) return 'web_assistant';
    return 'unknown';
  }

  const allSessions: SessionDetail[] = [];
  const abandonedSessions: SessionDetail[] = [];
  const causeCounts = new Map<string, number>();

  let totalWithMessages = 0;
  let inProgress = 0;
  let abandoned = 0;
  let converted = 0;

  for (const session of sessions) {
    const realMessages = session.messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant',
    );
    const hasProfile = session.messages.some((m) => m.role === 'profile');

    if (realMessages.length === 0 && !hasProfile) continue;
    totalWithMessages++;

    const lastMsg = realMessages[0] ?? session.messages[0];
    const hoursSince = Math.floor((now - lastMsg.createdAt.getTime()) / 3_600_000);

    let status: SessionDetail['status'] = 'abandoned';
    let cause = 'Razón no identificada';

    if (hasProfile) {
      status = 'converted';
      cause = 'Venta / Pedido completado';
      converted++;
    } else if (hoursSince < 2) {
      status = 'in_progress';
      cause = 'En curso (activa recientemente)';
      inProgress++;
    } else {
      status = 'abandoned';
      abandoned++;
      const lastAssistantContent = realMessages.find((m) => m.role === 'assistant')?.content;
      cause = classifyAbandonCause(lastAssistantContent);
      causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);
    }

    const item: SessionDetail = {
      id: session.id,
      phone: session.phone ?? session.userId ?? 'desconocido',
      userId: session.userId,
      source: classifySessionSource(session),
      status,
      messageCount: realMessages.length,
      lastActivity: lastMsg.createdAt.toISOString(),
      hoursSinceLastMsg: hoursSince,
      possibleCause: cause,
      lastMessages: realMessages.slice(0, 4).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 220),
        createdAt: m.createdAt.toISOString(),
      })),
      allMessages: [...session.messages].reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };

    allSessions.push(item);
    if (status === 'abandoned') {
      abandonedSessions.push(item);
    }
  }

  // Sort by latest activity first
  allSessions.sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
  abandonedSessions.sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  return NextResponse.json({
    stats: {
      total: totalWithMessages,
      converted,
      inProgress,
      abandoned,
      conversionRate: totalWithMessages > 0 ? Math.round((converted / totalWithMessages) * 100) : 0,
    },
    systemHealth,
    abandonCauses: Array.from(causeCounts.entries())
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count),
    sessions: allSessions,
    abandonedSessions,
  });
}

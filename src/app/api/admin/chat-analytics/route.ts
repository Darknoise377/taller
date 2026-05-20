import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const CAUSE_PATTERNS: Array<{ label: string; test: (m: string) => boolean }> = [
  { label: 'Producto sin stock', test: (m) => /no (lo )?tenemos|no hay|sin stock|agotado/.test(m) },
  { label: 'Error técnico del asistente', test: (m) => /tuve un problema|procesando tu mensaje/.test(m) },
  { label: 'Consulta fuera de tema', test: (m) => /solo manejo motos|solo manejo/.test(m) },
  { label: 'Abandonó al pedir datos del pedido', test: (m) => /c[eé]dula|direcci[oó]n|ciudad|departamento|email|correo|tel[eé]fono/.test(m) },
  { label: 'Consultó precio pero no compró', test: (m) => /\$\s*[\d.]|precio|valor/.test(m) },
  { label: 'Consultó producto pero no compró', test: (m) => /disponible|tenemos|kit|repuesto|pastilla|aceite|filtro|llanta|freno/.test(m) },
  { label: 'Abandonó en saludo inicial', test: (m) => /con qui[eé]n tengo|cu[aá]l es tu nombre/.test(m) },
];

function classifyAbandonCause(lastAssistantMsg?: string): string {
  if (!lastAssistantMsg) return 'Sin respuesta del asistente';
  const lower = lastAssistantMsg.toLowerCase();
  for (const { label, test } of CAUSE_PATTERNS) {
    if (test(lower)) return label;
  }
  return 'Razón no identificada';
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get('days') ?? '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Sessions in the period
  const sessions = await prisma.chatSession.findMany({
    where: { createdAt: { gte: since } },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const now = Date.now();

  // Sessions that completed an order have a 'profile' message
  const convertedSessionIds = new Set(
    sessions
      .filter((s) => s.messages.some((m) => m.role === 'profile'))
      .map((s) => s.id),
  );

  type SessionSummary = {
    id: number;
    phone: string;
    messageCount: number;
    lastActivity: string;
    hoursSinceLastMsg: number;
    possibleCause: string;
    lastMessages: Array<{ role: string; content: string; createdAt: string }>;
  };

  const abandonedSessions: SessionSummary[] = [];
  const causeCounts = new Map<string, number>();

  let inProgress = 0;
  let abandoned = 0;

  for (const session of sessions) {
    if (convertedSessionIds.has(session.id)) continue;

    const realMessages = session.messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant',
    );
    if (realMessages.length === 0) continue;

    const lastMsg = realMessages[0]; // already desc order
    const hoursSince = Math.floor((now - lastMsg.createdAt.getTime()) / 3_600_000);

    if (hoursSince < 2) {
      inProgress++;
      continue; // probably still active
    }

    abandoned++;

    const lastAssistantContent = realMessages.find((m) => m.role === 'assistant')?.content;
    const cause = classifyAbandonCause(lastAssistantContent);
    causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);

    // Only surface sessions where there was some engagement (≥3 messages)
    if (realMessages.length >= 3) {
      abandonedSessions.push({
        id: session.id,
        phone: session.phone ?? 'desconocido',
        messageCount: realMessages.length,
        lastActivity: lastMsg.createdAt.toISOString(),
        hoursSinceLastMsg: hoursSince,
        possibleCause: cause,
        lastMessages: realMessages.slice(0, 4).map((m) => ({
          role: m.role,
          content: m.content.slice(0, 220),
          createdAt: m.createdAt.toISOString(),
        })),
      });
    }
  }

  // Sort by most recent abandoned first
  abandonedSessions.sort((a, b) => a.hoursSinceLastMsg - b.hoursSinceLastMsg);

  const total = sessions.filter((s) =>
    s.messages.some((m) => m.role === 'user' || m.role === 'assistant'),
  ).length;

  const converted = convertedSessionIds.size;

  return NextResponse.json({
    stats: {
      total,
      converted,
      inProgress,
      abandoned,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
    },
    abandonCauses: Array.from(causeCounts.entries())
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count),
    abandonedSessions,
  });
}

import { NextResponse } from 'next/server';
import { getRequestActorFromCookie, writeSecurityAuditLog } from '@/lib/security/auditDb';
import { flushQueuedEmailsForOrder } from '@/lib/email/orderEmails';

export async function POST(req: Request) {
  const actor = await getRequestActorFromCookie(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';

  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
    await writeSecurityAuditLog({
      action: 'ACCESS_DENIED',
      path: '/api/admin/emails/flush',
      method: 'POST',
      actorId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      reason: 'Unauthorized',
      ip,
      userAgent,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { referenceCode } = body;
    if (!referenceCode || typeof referenceCode !== 'string') {
      return NextResponse.json({ error: 'referenceCode is required' }, { status: 400 });
    }

    await flushQueuedEmailsForOrder(referenceCode);

    await writeSecurityAuditLog({
      action: 'SENSITIVE_ACTION',
      path: '/api/admin/emails/flush',
      method: 'POST',
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      reason: 'Flushed queued emails for order',
      ip,
      userAgent,
      metadata: { referenceCode },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error flushing queued emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getRequestActorFromCookie, writeSecurityAuditLog } from '@/lib/security/auditDb';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { flushQueuedEmailsForOrder } from '@/lib/email/orderEmails';

export async function POST(req: Request) {
  const actor = await getRequestActorFromCookie(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';

  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
    await writeSecurityAuditLog({
      action: 'ACCESS_DENIED',
      path: '/api/admin/emails/flush-all',
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
    // Find orders that may have queued emails (rawResponse not null)
    const orders = await prisma.order.findMany({ where: { rawResponse: { not: Prisma.JsonNull } }, select: { referenceCode: true, rawResponse: true } });
    let processed = 0;
    for (const o of orders) {
      try {
        await flushQueuedEmailsForOrder(o.referenceCode);
        processed++;
      } catch (err) {
        console.error('Error flushing for order', o.referenceCode, err);
      }
    }

    await writeSecurityAuditLog({
      action: 'SENSITIVE_ACTION',
      path: '/api/admin/emails/flush-all',
      method: 'POST',
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      reason: 'Flushed queued emails for all orders (admin)',
      ip,
      userAgent,
      metadata: { processed },
    });

    return NextResponse.json({ ok: true, processed }, { status: 200 });
  } catch (error) {
    console.error('Error flushing all queued emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startedAt = Date.now();

  let database = 'down';
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'up';
  } catch {
    database = 'down';
  }

  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  const payuConfigured = Boolean(
    process.env.PAYU_MERCHANT_ID &&
      process.env.PAYU_ACCOUNT_ID &&
      process.env.PAYU_API_KEY &&
      process.env.PAYU_RESPONSE_URL &&
      process.env.PAYU_CONFIRMATION_URL &&
      process.env.PAYU_CHECKOUT_URL
  );

  const wompiConfigured = Boolean(
    process.env.WOMPI_PUBLIC_KEY &&
      process.env.WOMPI_INTEGRITY_SECRET
  );

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );

  const ok = database === 'up';

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - startedAt,
      services: {
        database,
        cloudinary: cloudinaryConfigured ? 'configured' : 'missing-config',
        payu: payuConfigured ? 'configured' : 'missing-config',
        wompi: wompiConfigured ? 'configured' : 'missing-config',
        smtp: smtpConfigured ? 'configured' : 'missing-config',
      },
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

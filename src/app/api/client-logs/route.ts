import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Log client errors to server console so they appear in deployment logs (Vercel, etc.)
    console.error('Client log received:', JSON.stringify(body, null, 2));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to process client log:', error);
    return NextResponse.json({ ok: false, error: 'failed to log' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeEnv } from '@/lib/razorpayServer';

export function requireAdminApiKey(req: NextRequest): NextResponse | null {
  const configured = sanitizeEnv(process.env.ADMIN_API_KEY);
  if (!configured) {
    return NextResponse.json(
      { error: 'Admin API is not configured.' },
      { status: 503 },
    );
  }

  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token || token !== configured) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}

export function isAdminUserId(userId: string): boolean {
  const raw = sanitizeEnv(process.env.ADMIN_USER_IDS);
  if (!raw) return false;
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

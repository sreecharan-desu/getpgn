import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { validateChessMoves } from '@/lib/chess-validator';
import { apiError } from '@/lib/security';
import { rateLimitByIp } from '@/lib/rateLimit';

const MAX_MOVES = 500;

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'validate', 60, 60_000);
  if (limited) return limited;

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const moves = body?.moves;

    if (!Array.isArray(moves)) {
      return NextResponse.json({ error: 'Invalid moves payload.' }, { status: 400 });
    }

    if (moves.length > MAX_MOVES) {
      return NextResponse.json({ error: 'Too many moves in request.' }, { status: 413 });
    }

    const result = validateChessMoves(moves);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return apiError('Validate API', error, 'Validation failed.');
  }
}

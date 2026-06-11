import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { USERNAME_PATTERN } from '@/lib/signupFlow';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/security';

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = rateLimit(`signup:check-username:${ip}`, 30, 60_000);
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterSec);

  const username = req.nextUrl.searchParams.get('username')?.trim() ?? '';

  if (!username || !USERNAME_PATTERN.test(username)) {
    return NextResponse.json({
      available: false,
      error: 'Username must be 3–32 characters (letters, numbers, _ or -).',
    });
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}

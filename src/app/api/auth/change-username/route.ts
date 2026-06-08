import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session';
import { requireVerifiedUser } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    const newUsername = username.trim();

    if (newUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
    }

    if (newUsername === user.username) {
      return NextResponse.json({ error: 'That is already your username.' }, { status: 400 });
    }

    // Uniqueness check: only allow the change if no other user already has it
    const existing = await prisma.user.findUnique({
      where: { username: newUsername },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: newUsername }
      });
    } catch (updateError) {
      // Handle a race where another request claimed the username first
      const err = updateError as { code?: string };
      if (err.code === 'P2002') {
        return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
      }
      throw updateError;
    }

    // Refresh the session so the JWT carries the new username (otherwise it goes stale)
    await createSession(user.id, newUsername);

    return NextResponse.json({
      success: true,
      username: newUsername
    });

  } catch (error) {
    const err = error as Error;
    console.error('Change username error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

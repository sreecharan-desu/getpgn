import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserWithPassword, getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const user = await getCurrentUserWithPassword();

    if (!user) {
      if (session) {
        return NextResponse.json(
          { error: 'User not found.', code: 'USER_NOT_FOUND' },
          { status: 500 },
        );
      }
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Please verify your email first.' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'New password must be different from your current password.' }, { status: 400 });
    }

    // Verify the current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    // Hash and store the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    const err = error as Error;
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

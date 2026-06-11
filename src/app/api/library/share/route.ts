import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { hasOrganizerLibraryAccess } from '@/lib/organizerWallet';
import {
  defaultOrganizerLibraryTitle,
  organizerLibrarySlugFromUserId,
} from '@/lib/organizerLibrary';
import { publishAllSavedGames } from '@/lib/publishLibraryGames';

function slugFromUserId(userId: string): string {
  return organizerLibrarySlugFromUserId(userId);
}

export async function GET() {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    if (!(await hasOrganizerLibraryAccess(auth.user))) {
      return NextResponse.json(
        { error: 'Public library requires prepaid scan credits or an Enterprise subscription.' },
        { status: 403 },
      );
    }

    let library = await prisma.organizerLibrary.findUnique({
      where: { userId: auth.user.id },
    });

    if (!library) {
      library = await prisma.organizerLibrary.create({
        data: {
          userId: auth.user.id,
          slug: slugFromUserId(auth.user.id),
          title: defaultOrganizerLibraryTitle(auth.user.username),
          enabled: true,
        },
      });
    }

    return NextResponse.json({ library });
  } catch (error) {
    console.error('[Library Share] GET error:', error);
    return NextResponse.json({ error: 'Could not load library settings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    if (!(await hasOrganizerLibraryAccess(auth.user))) {
      return NextResponse.json(
        { error: 'Public library requires prepaid scan credits or an Enterprise subscription.' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 120)
        : defaultOrganizerLibraryTitle(auth.user.username);
    const enabled = body.enabled !== false;

    const slug = slugFromUserId(auth.user.id);

    const library = await prisma.organizerLibrary.upsert({
      where: { userId: auth.user.id },
      create: {
        userId: auth.user.id,
        slug,
        title,
        enabled,
      },
      update: { title, enabled },
    });

    let sharedTotal: number | undefined;
    if (enabled) {
      const result = await publishAllSavedGames(auth.user.id);
      sharedTotal = result.sharedTotal;
    }

    return NextResponse.json({ success: true, library, sharedTotal });
  } catch (error) {
    console.error('[Library Share] POST error:', error);
    return NextResponse.json({ error: 'Could not update library settings.' }, { status: 500 });
  }
}

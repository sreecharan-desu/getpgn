import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedUser } from "@/lib/requireAuth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const userLimit = rateLimit(`feedback:user:${auth.user.id}`, 10, 24 * 60 * 60_000);
    if (!userLimit.ok) {
      return NextResponse.json({ error: "Feedback limit reached for today." }, { status: 429 });
    }

    const body = await req.json();
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    const gameId = typeof body.gameId === "string" ? body.gameId.trim() : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    if (!comment) {
      return NextResponse.json({ error: "Please add a short comment." }, { status: 400 });
    }

    if (comment.length > 2000) {
      return NextResponse.json({ error: "Comment is too long." }, { status: 400 });
    }

    if (gameId) {
      const game = await prisma.savedGame.findFirst({
        where: { id: gameId, userId: auth.user.id },
        select: { id: true },
      });
      if (!game) {
        return NextResponse.json({ error: "Game not found." }, { status: 404 });
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: auth.user.id,
        rating,
        comment,
        gameId: gameId || null,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}

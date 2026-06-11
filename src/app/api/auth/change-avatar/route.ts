import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isChessAvatarPiece } from "@/lib/chessAvatars";
import { requireVerifiedUser } from "@/lib/requireAuth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const { avatarPiece } = await req.json();

    if (!avatarPiece || typeof avatarPiece !== "string") {
      return NextResponse.json({ error: "Avatar piece is required." }, { status: 400 });
    }

    const piece = avatarPiece.trim().toLowerCase();
    if (!isChessAvatarPiece(piece)) {
      return NextResponse.json({ error: "Invalid chess piece." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { avatarPiece: piece },
    });

    return NextResponse.json({ success: true, avatarPiece: piece });
  } catch (error) {
    console.error("Change avatar error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 },
    );
  }
}

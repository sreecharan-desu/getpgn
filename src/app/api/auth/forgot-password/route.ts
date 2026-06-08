import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 },
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true, username: true },
    });

    // 2. If user doesn't exist, return success immediately to prevent email enumeration
    if (!user) {
      console.log(
        `[Forgot Password] Requested email ${trimmedEmail} not found. Returning generic success.`,
      );
      return NextResponse.json({
        success: true,
        message:
          "If an account exists for this email, a reset link has been sent.",
      });
    }

    // 3. Rate limiting check (e.g. check if a reset token was created in the last 60 seconds)
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (recentToken) {
      console.log(
        `[Forgot Password] Rate limit hit for user ${user.username} (${trimmedEmail}).`,
      );
      return NextResponse.json(
        {
          error:
            "You recently requested a password reset. Please check your inbox or wait 60 seconds.",
        },
        { status: 429 },
      );
    }

    // 4. Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // 5. Store in DB
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        used: false,
      },
    });

    // 6. Send email via Resend (non-blocking — response returns immediately)
    void sendPasswordResetEmail(trimmedEmail, token).catch((err) => {
      console.error('[Forgot Password] Background email send failure:', err);
    });

    // 7. Generic success response
    return NextResponse.json({
      success: true,
      message:
        "If an account exists for this email, a reset link has been sent.",
    });
  } catch (error) {
    const err = error as Error;
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 },
    );
  }
}

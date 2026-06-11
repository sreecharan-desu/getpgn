import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { validateChessMoves } from '@/lib/chess-validator';
import { apiError } from '@/lib/security';
import { rateLimitByIp, rateLimitByUser } from '@/lib/rateLimit';
import {
  reserveScanForUser,
  rollbackScanReservation,
  type ScanReservation,
} from '@/lib/scanLimits';
import { notifyOrganizerWalletScanUsed } from '@/lib/notificationEmail';
import { completeReferralOnFirstScan } from '@/lib/referrals';
import { prisma } from '@/lib/db';
import {
  createValidationSessionToken,
  verifyValidationSessionToken,
} from '@/lib/validationSession';

const MAX_MOVES = 500;

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'validate', 60, 60_000);
  if (limited) return limited;

  let reservation: ScanReservation | null = null;
  let scanConsumed = false;

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const userLimited = rateLimitByUser(auth.user.id, 'validate', 120, 60_000);
    if (userLimited) return userLimited;

    const body = await req.json();
    const moves = body?.moves;
    const validationToken =
      typeof body?.validationToken === 'string' ? body.validationToken : undefined;

    if (!Array.isArray(moves)) {
      return NextResponse.json({ error: 'Invalid moves payload.' }, { status: 400 });
    }

    if (moves.length > MAX_MOVES) {
      return NextResponse.json({ error: 'Too many moves in request.' }, { status: 413 });
    }

    const hasSession = verifyValidationSessionToken(validationToken, auth.user.id);
    if (!hasSession) {
      const reserved = await reserveScanForUser(auth.user);
      if (!reserved.ok) return reserved.response;
      reservation = reserved.reservation;
      scanConsumed = true;
    }

    const result = validateChessMoves(moves);

    if (reservation?.source === 'organizer_wallet') {
      void notifyOrganizerWalletScanUsed(auth.user.id).catch((err) =>
        console.error('[Validate API] Wallet notification failed:', err),
      );
    }

    reservation = null;

    let scanCount: number | undefined;
    let bonusScanCount: number | undefined;
    let referralBonusApplied = false;
    let referrerUsername: string | undefined;
    let referralRewardScans: number | undefined;
    if (scanConsumed) {
      try {
        const referralResult = await completeReferralOnFirstScan(auth.user.id);
        if (referralResult.completed) {
          referralBonusApplied = true;
          referrerUsername = referralResult.referrerUsername;
          referralRewardScans = referralResult.rewardScans;
        }
      } catch (err) {
        console.warn('[Validate API] Referral completion failed:', err);
      }
      const freshQuota = await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { scanCount: true, bonusScanCount: true },
      });
      scanCount = freshQuota?.scanCount;
      bonusScanCount = freshQuota?.bonusScanCount;
    }

    return NextResponse.json({
      ...result,
      validationToken: createValidationSessionToken(auth.user.id),
      scanConsumed,
      ...(scanConsumed
        ? {
            scanCount,
            bonusScanCount,
            ...(referralBonusApplied
              ? { referralBonusApplied, referrerUsername, referralRewardScans }
              : {}),
          }
        : {}),
    });
  } catch (error: unknown) {
    if (reservation) {
      await rollbackScanReservation(reservation);
    }
    return apiError('Validate API', error, 'Validation failed.');
  }
}

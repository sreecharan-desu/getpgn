import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/db';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { validateChessMoves } from '@/lib/chess-validator';
import { apiError, validateImageUpload } from '@/lib/security';
import { rateLimitByIp, rateLimitByUser } from '@/lib/rateLimit';
import {
  reserveScanForUser,
  rollbackScanReservation,
  type ScanReservation,
} from '@/lib/scanLimits';
import { notifyOrganizerWalletScanUsed } from '@/lib/notificationEmail';
import { createValidationSessionToken } from '@/lib/validationSession';
import { completeReferralOnFirstScan } from '@/lib/referrals';
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_MESSAGE,
} from '@/lib/extractionPrompt';
import { normalizeExtractedMoves } from '@/lib/extractedNotation';

let cachedAiClient: GoogleGenAI | null = null;

function getAiClient(apiKey: string) {
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({ apiKey });
  }
  return cachedAiClient;
}

export async function POST(req: NextRequest) {
  const limited = rateLimitByIp(req, 'extract', 20, 60 * 60_000);
  if (limited) return limited;

  const apiStartTime = Date.now();
  let reservation: ScanReservation | null = null;

  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;

    const userLimited = rateLimitByUser(auth.user.id, 'extract', 10, 60 * 60_000);
    if (userLimited) return userLimited;

    const reserved = await reserveScanForUser(auth.user);
    if (!reserved.ok) return reserved.response;
    reservation = reserved.reservation;

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      await rollbackScanReservation(reservation);
      reservation = null;
      return NextResponse.json(
        { error: 'AI extraction is not configured.' },
        { status: 503 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const validated = await validateImageUpload(file);
    if (!validated.ok) {
      await rollbackScanReservation(reservation);
      reservation = null;
      return validated.response;
    }

    const { buffer, mimeType } = validated;
    const base64Data = buffer.toString('base64');

    console.log(`[Extract API] ── START ─────────────────────────────────────`);
    console.log(
      `[Extract API] File received: size=${buffer.length}B  type=${mimeType}`,
    );

    const ai = getAiClient(apiKey);

    const systemPrompt = EXTRACTION_SYSTEM_PROMPT;

    const aiStartTime = Date.now();
    const modelName = process.env.AI_MODEL_NAME || ['ge', 'mi', 'ni', '-2.5-flash-lite'].join('');
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: EXTRACTION_USER_MESSAGE },
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            moves: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  moveNumber: { type: 'integer' },
                  white: {
                    type: 'object',
                    properties: {
                      notation: { type: 'string' },
                      confidence: { type: 'number' },
                    },
                    required: ['notation'],
                  },
                  black: {
                    type: 'object',
                    properties: {
                      notation: { type: 'string' },
                      confidence: { type: 'number' },
                    },
                    required: ['notation'],
                  },
                },
                required: ['moveNumber', 'white', 'black'],
              },
            },
          },
          required: ['moves'],
        },
        temperature: 0.0,
      },
    });
    const aiTimeMs = Date.now() - aiStartTime;

    const responseText = response.text;
    if (!responseText) {
      console.error('[Extract API] AI engine returned empty content.');
      await rollbackScanReservation(reservation);
      reservation = null;
      return NextResponse.json({ error: 'AI extraction failed.' }, { status: 500 });
    }

    try {
      const parsedJson = JSON.parse(responseText);
      const normalizedMoves = normalizeExtractedMoves(parsedJson.moves ?? []);
      const validation = validateChessMoves(normalizedMoves, {
        strictRecovery: true,
      });

      parsedJson.moves = validation.moves;
      parsedJson.pgn = validation.pgn;
      parsedJson.valid = validation.valid;
      parsedJson.latency = {
        aiProcessingTimeMs: aiTimeMs,
        totalApiTimeMs: Date.now() - apiStartTime,
      };
      parsedJson.validationToken = createValidationSessionToken(auth.user.id);
      parsedJson.scanConsumed = true;

      if (reservation.source === 'organizer_wallet') {
        void notifyOrganizerWalletScanUsed(auth.user.id).catch((err) =>
          console.error('[Extract API] Wallet notification failed:', err),
        );
      }

      reservation = null;

      try {
        const referralResult = await completeReferralOnFirstScan(auth.user.id);
        if (referralResult.completed) {
          parsedJson.referralBonusApplied = true;
          parsedJson.referrerUsername = referralResult.referrerUsername;
          parsedJson.referralRewardScans = referralResult.rewardScans;
        }
      } catch (err) {
        console.warn('[Extract API] Referral completion failed:', err);
      }

      const freshQuota = await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { scanCount: true, bonusScanCount: true },
      });
      if (freshQuota) {
        parsedJson.scanCount = freshQuota.scanCount;
        parsedJson.bonusScanCount = freshQuota.bonusScanCount;
      }

      console.log(
        `[Extract API] ── END (success, total time ${Date.now() - apiStartTime}ms) ─────────────────────────────`,
      );

      return NextResponse.json(parsedJson);
    } catch (parseError) {
      console.error('[Extract API] Failed to parse AI JSON response:', parseError);
      if (reservation) {
        await rollbackScanReservation(reservation);
        reservation = null;
      }
      return NextResponse.json({ error: 'Failed to parse extracted content.' }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('[Extract API] ── END (error) ────────────────────────────────');
    if (reservation) {
      await rollbackScanReservation(reservation);
    }
    return apiError('Extract API', error, 'Extraction failed. Please try again.');
  }
}

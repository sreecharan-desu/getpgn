import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { validateChessMoves } from '@/lib/chess-validator';
import { apiError, validateImageUpload } from '@/lib/security';
import { rateLimitByIp, rateLimitByUser } from '@/lib/rateLimit';
import {
  reserveScanForUser,
  rollbackScanReservation,
  type ScanReservation,
} from '@/lib/scanLimits';
import { createValidationSessionToken } from '@/lib/validationSession';

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

    const systemPrompt = `You are an expert chess scoresheet OCR extraction engine. Your job is to accurately read every chess move written on the scoresheet image.

Return JSON only in this exact schema structure:
{
  "moves": [
    {
      "moveNumber": 1,
      "white": { "notation": "e4", "confidence": 0.98 },
      "black": { "notation": "e5", "confidence": 0.97 }
    }
  ]
}

EXTRACTION RULES:
1. Piece letters: K=King Q=Queen R=Rook B=Bishop N=Knight. If a letter looks like W or J, it is most likely N (Knight).
2. Castling: always write as capital letter O, not zero. O-O (kingside) or O-O-O (queenside).
3. Captures use lowercase x (not uppercase X).
4. Do NOT include game result tokens (1-0, 0-1, ½-½, 1/2-1/2) as moves.
5. If black's last move is missing (game ended on white's move), return empty string for black notation.
6. File letters are always a-h lowercase. Rank numbers are always 1-8.

AMBIGUITY RESOLUTION (critical — apply in this order):
7. b vs h file confusion: When a Bishop or Rook move could be file 'b' or file 'h', choose the square that is LEGALLY REACHABLE from the piece's current position. Example: if the bishop is on c4, "Bb5" is reachable but "Bh5" is not — use "Bb5".
8. Digit-as-letter confusion: If you see a '9' where a file letter should be (between a piece letter and a destination square), it is likely the letter 'g'. Extract what you see literally and flag as uncertain.
9. N vs W: Always prefer N over W for knight moves. W is never a valid piece letter.
10. Check (+) and checkmate (#) symbols: Only include if clearly written at the END of the move. Never include them mid-notation.
11. Move number confusion: Ignore move numbers when extracting notation (e.g. "12. Nf3" → extract "Nf3").

UNCERTAINTY:
12. If a move is illegible or ambiguous after applying the rules above, include your best read in "moves" with low confidence (< 0.75) — never omit a move entirely.
13. Never invent or hallucinate moves that are not visible on the sheet.`;

    const aiStartTime = Date.now();
    const modelName = process.env.AI_MODEL_NAME || ['ge', 'mi', 'ni', '-2.5-flash-lite'].join('');
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
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
      const validation = validateChessMoves(parsedJson.moves);

      parsedJson.moves = validation.moves;
      parsedJson.pgn = validation.pgn;
      parsedJson.valid = validation.valid;
      parsedJson.latency = {
        aiProcessingTimeMs: aiTimeMs,
        totalApiTimeMs: Date.now() - apiStartTime,
      };
      parsedJson.validationToken = createValidationSessionToken(auth.user.id);
      parsedJson.scanConsumed = true;

      reservation = null;

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

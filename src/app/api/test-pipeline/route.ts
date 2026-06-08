import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { requireVerifiedUser } from '@/lib/requireAuth';
import { prisma } from '@/lib/db';
import { isProUser } from '@/lib/proAccess';
import { validateChessMoves } from '@/lib/chess-validator';
import { isDevRouteAllowed, devRouteBlockedResponse } from '@/lib/security';

// ─── Image Compression ────────────────────────────────────────────────────────
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600;
const JPEG_QUALITY = 85;

async function compressImage(buffer: Buffer): Promise<{ data: Buffer; mimeType: string }> {
  try {
    const metadata = await sharp(buffer).metadata();
    const { width = 0, height = 0 } = metadata;
    const needsResize = width > MAX_WIDTH || height > MAX_HEIGHT;
    const resizeOptions = needsResize
      ? { width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside' as const }
      : undefined;
    const compressed = await sharp(buffer)
      .resize(resizeOptions)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return { data: compressed, mimeType: 'image/jpeg' };
  } catch {
    return { data: buffer, mimeType: 'image/jpeg' };
  }
}

// ─── API Route ────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isDevRouteAllowed()) return devRouteBlockedResponse();

  const apiStartTime = Date.now();
  try {
    const auth = await requireVerifiedUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    // Gating check: block free users with >= 2 scans
    const isPro = isProUser(user);
    if (!isPro && user.scanCount >= 2) {
      return NextResponse.json({
        error: 'Scan limit exceeded. You have already used your 2 free scans. Please upgrade to a Paid plan to unlock unlimited scans.',
        limitExceeded: true
      }, { status: 403 });
    }

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI_API_KEY environment variable is not configured.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const { data: imageBuffer, mimeType } = await compressImage(rawBuffer);
    const base64Data = imageBuffer.toString('base64');

    const ai = new GoogleGenAI({ apiKey });

    // Improved prompt with explicit instructions to resolve common handwriting ambiguities
    const systemPrompt = `You are an expert chess scoresheet OCR parser. Extract every chess move from the scoresheet image.

Output ONLY valid JSON in exactly this format, no other text:
{
  "moves": [
    {"move_number": 1, "white": "e4", "black": "e5"},
    {"move_number": 2, "white": "Nf3", "black": "Nc6"}
  ],
  "uncertain_moves": [
    {"move_number": 5, "player": "white", "notation": "Bb5", "reason": "handwriting unclear"}
  ]
}

Rules:
1. Extract moves EXACTLY as written. Do NOT attempt to validate or fix legality yourself.
2. Piece letters: K=King, Q=Queen, R=Rook, B=Bishop, N=Knight. If a letter looks like W or J, it is most likely N (Knight).
3. Castling: use capital letter O, not zero: O-O or O-O-O.
4. File letters are a-h (lowercase). If a letter could be 'b' or 'h', extract what you see literally.
5. Captures use lowercase 'x', not 'X'. Convert uppercase X to lowercase x.
6. Do NOT include game result tokens (1-0, 0-1, 1/2-1/2, ½-½, *) as moves. If the game ends with a score, use empty string "" for black.
7. If a move is ambiguous or illegible, make your best read in "moves" and also add it to "uncertain_moves" with the reason.
8. If you see "9" where a file letter should be (e.g. "N9e7", "B93"), extract it as "9" and flag as uncertain.`;

    const aiStartTime = Date.now();
    const modelName = process.env.AI_MODEL_NAME || ['ge', 'mi', 'ni', '-2.5-flash-lite'].join('');
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: 'Extract all chess moves from this scoresheet and return them as JSON.' },
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
                  move_number: { type: 'integer' },
                  white: { type: 'string' },
                  black: { type: 'string' },
                },
                required: ['move_number', 'white', 'black'],
              },
            },
            uncertain_moves: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  move_number: { type: 'integer' },
                  player: { type: 'string' },
                  notation: { type: 'string' },
                  reason: { type: 'string' },
                },
                required: ['move_number', 'player', 'notation', 'reason'],
              },
            },
          },
          required: ['moves', 'uncertain_moves'],
        },
        temperature: 0.0,
      },
    });

    const aiTimeMs = Date.now() - aiStartTime;
    const responseText = response.text;
    if (!responseText) {
      return NextResponse.json({ error: 'AI returned empty content.' }, { status: 500 });
    }

    const parsedData = JSON.parse(responseText);
    const rawMovesList = parsedData.moves || [];
    const uncertainList = parsedData.uncertain_moves || [];

    interface ExtractedMove {
      move_number: number;
      white: string;
      black: string;
    }

    const validatorPayload = {
      moves: (rawMovesList as ExtractedMove[]).map((m) => ({
        moveNumber: m.move_number,
        white: m.white,
        black: m.black
      }))
    };

    // ─── Call TypeScript chess validator ──────────────────────────────────
    const validatorResult = validateChessMoves(validatorPayload.moves);
    
    // Map Python validator results to route response metrics
    let movesDetected = 0;
    let legalMovesCount = 0;
    let appliedMovesCount = 0;

    const illegalMoves: Array<{
      move_number: number;
      player: 'white' | 'black';
      notation: string;
      reason: string;
    }> = [];

    const recoveredMoves: Array<{
      move_number: number;
      player: 'white' | 'black';
      notation: string;
      applied_as: string;
    }> = [];

    const validatedTurns = validatorResult.moves || [];
    for (const turn of validatedTurns) {
      const moveNum = turn.moveNumber;
      
      for (const player of ['white', 'black'] as const) {
        const ply = turn[player];
        if (!ply || !ply.original) continue;

        const orig = ply.original.trim();
        // Skip game termination results
        const isResult = ['1-0', '0-1', '1/2-1/2', '½-½', '*'].includes(orig);
        if (isResult) continue;

        movesDetected++;
        const status = ply.status;
        const san = ply.san;

        if (status === 'valid') {
          legalMovesCount++;
          appliedMovesCount++;
        } else if (status === 'ambiguous' || (status === 'illegal' && san !== null)) {
          appliedMovesCount++;
          recoveredMoves.push({
            move_number: moveNum,
            player: player,
            notation: orig,
            applied_as: san!
          });
        } else if (status === 'illegal' && san === null) {
          illegalMoves.push({
            move_number: moveNum,
            player: player,
            notation: orig,
            reason: (ply.suggestions && ply.suggestions.length > 0)
              ? `Illegal move. Suggestions: ${ply.suggestions.join(', ')}`
              : 'Illegal move (no recovery suggestions found).'
          });
        }
      }
    }

    const totalTimeMs = Date.now() - apiStartTime;
    const generatedPgn = validatorResult.pgn || '';
    const hasIllegal = illegalMoves.length > 0;
    const hasRecovered = recoveredMoves.length > 0;
    const pgnIsPartial = hasIllegal && !hasRecovered && appliedMovesCount < movesDetected;
    const pgnHasRecoveries = hasRecovered;

    if (!isPro) {
      await prisma.user.update({
        where: { id: user.id },
        data: { scanCount: { increment: 1 } }
      });
    }

    return NextResponse.json({
      processing_time_ms: totalTimeMs,
      ai_time_ms: aiTimeMs,
      moves_detected: movesDetected,
      legal_moves_count: legalMovesCount,
      recovered_moves_count: recoveredMoves.length,
      applied_moves_count: appliedMovesCount,
      illegal_moves: illegalMoves,
      recovered_moves: recoveredMoves,
      uncertain_moves: uncertainList,
      generated_pgn: generatedPgn,
      pgn_is_partial: pgnIsPartial,
      pgn_has_recoveries: pgnHasRecoveries,
      moves: rawMovesList,
      scan_count: !isPro ? user.scanCount + 1 : undefined
    });

  } catch (error) {
    const err = error as Error;
    console.error('Test pipeline error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

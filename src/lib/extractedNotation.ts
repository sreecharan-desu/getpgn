/**
 * Pre-clean raw model output before SAN sanitize / validation.
 * Fixes common Gemini OCR shapes without game-specific rules.
 */
import { sanitizeChessNotation } from "@/lib/chess-notation";

/** Handwritten l / I often used instead of rank 1. */
function fixTerminalOneMisread(s: string): string {
  return s.replace(/([a-h])l(\+?#?)$/i, "$11$2");
}

/** Pawn moves must use lowercase files (C3 → c3). */
function fixUppercasePawnFile(s: string): string {
  if (/^[A-H](?:x[a-h][1-8]|[1-8](?:=[QRBN])?)?(\+?#?)?$/.test(s)) {
    return s.charAt(0).toLowerCase() + s.slice(1);
  }
  return s;
}

/** Drop trailing junk after an otherwise complete piece-to-square shape. */
function stripTrailingGarbage(s: string): string {
  const m = s.match(/^((?:O-O-O|O-O)|[KQRBN][a-h][1-8](?:x[a-h][1-8])?)(\+?#?)$/i);
  if (m) return m[1] + (m[2] ?? "");
  const pawn = s.match(/^([a-h](?:x[a-h][1-8]|[1-8](?:=[QRBN])?))(\+?#?)$/i);
  if (pawn) return pawn[1] + (pawn[2] ?? "");
  return s;
}

/** Collapse accidental spaces and stray punctuation from JSON OCR. */
function collapseWhitespace(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, "")
    .replace(/[.,;:!?"'\\|`~@$%&*[\]{}]/g, "")
    .replace(/[–—−]/g, "-");
}

/**
 * Light cleanup on a single move string straight from the model.
 * Preserves intent; heavy fixes happen in sanitizeChessNotation.
 */
export function preSanitizeExtractedNotation(raw: string): string {
  if (!raw) return "";
  let s = collapseWhitespace(raw);
  if (!s) return "";
  s = fixTerminalOneMisread(s);
  s = fixUppercasePawnFile(s);
  s = stripTrailingGarbage(s);
  return s;
}

export type RawMoveTurn = {
  moveNumber: number;
  white: unknown;
  black: unknown;
};

function readNotation(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field.trim();
  if (typeof field === "object" && field !== null) {
    const d = field as Record<string, unknown>;
    const val = d.notation ?? d.original;
    if (val != null) return String(val).trim();
  }
  return "";
}

/** Normalize all notations in a Gemini moves array before validation. */
export function normalizeExtractedMoves<T extends RawMoveTurn>(moves: T[]): T[] {
  return moves.map((turn) => {
    const whiteRaw = readNotation(turn.white);
    const blackRaw = readNotation(turn.black);
    const whiteNorm = preSanitizeExtractedNotation(whiteRaw);
    const blackNorm = preSanitizeExtractedNotation(blackRaw);

    const patch = (field: unknown, norm: string) => {
      if (!norm && !field) return field;
      if (typeof field === "string") return norm;
      if (typeof field === "object" && field !== null) {
        return { ...(field as object), notation: norm };
      }
      return { notation: norm, confidence: 0.5 };
    };

    return {
      ...turn,
      white: patch(turn.white, whiteNorm),
      black: patch(turn.black, blackNorm),
    };
  });
}

/** True when notation is too corrupted to auto-apply a guessed legal move. */
export function isRecoverableExtractedNotation(raw: string): boolean {
  const pre = preSanitizeExtractedNotation(raw);
  const sanitized = sanitizeChessNotation(pre);
  if (!sanitized || sanitized.length < 2) return false;
  const cleanRaw = raw.replace(/\s+/g, "").toLowerCase();
  const cleanSan = sanitized.replace(/[+#]/g, "").toLowerCase();
  if (!cleanRaw || !cleanSan) return false;
  let matches = 0;
  const n = Math.max(cleanRaw.length, cleanSan.length);
  for (let i = 0; i < Math.min(cleanRaw.length, cleanSan.length); i++) {
    if (cleanRaw[i] === cleanSan[i]) matches++;
  }
  return matches / n >= 0.55;
}

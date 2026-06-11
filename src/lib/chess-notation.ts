/**
 * Normalize OCR / handwriting confusions and strip characters invalid in SAN.
 * Used before chess.js strict parse — not applied to fuzzy-match originals.
 */

const CASTLING_KS = /^(?:0-0|o-o|oo|00)$/i;
const CASTLING_QS = /^(?:0-0-0|o-o-o|ooo|000)$/i;

/** Characters allowed in a move body (excluding trailing + / #). */
const SAN_BODY_CHAR = /^[KQRBNOa-hx=\-1-8]$/i;

/** Pawn pushes/captures only — not bishop disambiguation (e.g. bc4). */
const PAWN_MOVE = /^[a-h](?:[1-8](?:=[QRBN])?|x[a-h][1-8](?:=[QRBN])?)$/i;

function normalizeCastlingForms(notation: string): string {
  const t = notation.trim();
  if (CASTLING_QS.test(t)) return "O-O-O";
  if (CASTLING_KS.test(t)) return "O-O";
  return notation
    .replace(/\b0-0-0\b/gi, "O-O-O")
    .replace(/\b0-0\b/gi, "O-O")
    .replace(/\bo-o-o\b/gi, "O-O-O")
    .replace(/\bo-o\b/gi, "O-O");
}

/** Targeted 9→g fixes only in clear OCR confusion contexts (not broad rank rewrites). */
function fixOcrDigitConfusions(body: string): string {
  let s = body;
  s = s.replace(/([KQRBN])9(?=[a-h][1-8])/gi, "$1g");
  s = s.replace(/([KQRBN])9([1-8])/gi, "$1g$2");
  s = s.replace(/x9(?=[a-h][1-8])/gi, "xg");
  s = s.replace(/x9([1-8])/gi, "xg$1");
  return s;
}

function stripInvalidSanCharacters(body: string): string {
  let out = "";
  for (const ch of body) {
    if (ch.toLowerCase() === "x") {
      out += "x";
      continue;
    }
    if (SAN_BODY_CHAR.test(ch)) {
      out += ch;
    }
  }
  return out;
}

function normalizeKnightMisread(body: string): string {
  if (!body) return body;
  const first = body[0];
  // W / J are never valid SAN piece letters — common knight OCR misreads.
  if (first === "W" || first === "w" || first === "J" || first === "j") {
    return `N${body.slice(1)}`;
  }
  return body;
}

function ensurePieceLetterCase(body: string): string {
  if (!body || PAWN_MOVE.test(body)) return body;
  const first = body[0];
  if (/^[kqrbn]/.test(first)) {
    return first.toUpperCase() + body.slice(1);
  }
  return body;
}

function normalizeCheckSuffix(raw: string): { body: string; suffix: string } {
  const match = raw.match(/([+#]+)$/);
  if (!match) return { body: raw, suffix: "" };
  const suffix = match[1].includes("#") ? "#" : "+";
  return { body: raw.slice(0, -match[1].length), suffix };
}

/** Rb+ on scoresheets usually means Rb1 (check mark confused with rank 1). */
function fixPlusAsRankOne(body: string, suffix: string): { body: string; suffix: string } {
  if (suffix === "+" && /^[RNBQK][a-h]$/i.test(body)) {
    return { body: `${body}1`, suffix: "" };
  }
  return { body, suffix };
}

/**
 * Sanitize a single move for strict chess.js parsing.
 * Strips non-SAN characters; does not rewrite pawn b-/h-file moves as piece moves.
 */
export function sanitizeChessNotation(raw: string): string {
  if (!raw) return "";

  let s = raw.trim().replace(/\s+/g, "");
  if (!s) return "";

  s = s.replace(/[.,;:!?"'\\|`~@$%&*[\]{}]/g, "");
  s = s.replace(/[–—−]/g, "-");

  s = normalizeCastlingForms(s);
  if (s === "O-O" || s === "O-O-O") return s;

  let { body: rawBody, suffix } = normalizeCheckSuffix(s);
  ({ body: rawBody, suffix } = fixPlusAsRankOne(rawBody, suffix));
  let body = rawBody.replace(/X/g, "x");
  body = normalizeKnightMisread(body);
  body = fixOcrDigitConfusions(body);
  body = stripInvalidSanCharacters(body);
  body = ensurePieceLetterCase(body);

  return `${body}${suffix}`;
}

/** True if every character is valid SAN (after sanitization). */
export function isSanCharacterSetValid(notation: string): boolean {
  const s = sanitizeChessNotation(notation);
  if (!s) return false;
  const { body, suffix } = normalizeCheckSuffix(s);
  if (suffix && !/^[+#]$/.test(suffix)) return false;
  if (!body) return suffix === "";
  for (const ch of body) {
    if (ch.toLowerCase() === "x") continue;
    if (!SAN_BODY_CHAR.test(ch)) return false;
  }
  return true;
}

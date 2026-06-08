import 'server-only';
import { Chess, Move } from 'chess.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlyResult {
  original: string;
  status: 'valid' | 'illegal' | 'ambiguous' | 'missing';
  san: string | null;
  candidates: string[];
  suggestions: string[];
  fen: string | null;
  uci: string | null;
}

export interface TurnResult {
  moveNumber: number;
  white: PlyResult;
  black: PlyResult;
}

export interface ValidationResult {
  valid: boolean;
  moves: TurnResult[];
  pgn: string;
}

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

// ─── Notation Helpers ─────────────────────────────────────────────────────────

function cleanNotation(notation: string): string {
  return notation.replace(/[+#xX:=\-()/]/g, '').trim().toLowerCase();
}

function isGameResult(notation: string): boolean {
  const clean = notation.trim().replace(/\s/g, '');
  return ['1-0', '0-1', '1/2-1/2', '1/2', '*', '1', '0', '1/2-1/2*', '1-0*', '0-1*'].includes(clean);
}

function normalizeNotation(notation: string): string {
  const norm = notation.trim();
  if (norm === '0-0' || norm === '00') return 'O-O';
  if (norm === '0-0-0' || norm === '000') return 'O-O-O';
  return norm;
}

/** LCS-based SequenceMatcher.ratio() equivalent */
function getSimilarity(s1: string, s2: string): number {
  const c1 = cleanNotation(s1);
  const c2 = cleanNotation(s2);
  if (c1 === c2) return 1.0;
  const m = c1.length, n = c2.length;
  if (m === 0 && n === 0) return 1.0;
  if (m === 0 || n === 0) return 0.0;
  // LCS DP
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = c1[i - 1] === c2[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return (2.0 * dp[m][n]) / (m + n);
}

/**
 * Determines which piece type(s) the user's notation implies.
 * Mirrors the Python get_implied_piece_types() logic.
 */
function getImpliedPieceTypes(notation: string): Set<PieceType> {
  const clean = cleanNotation(notation);
  if (!clean) return new Set();

  // Castling
  if (['oo', 'ooo', '00', '000'].includes(clean)) return new Set(['k']);

  const orig = notation.trim();
  if (!orig) return new Set();
  const first = orig[0];

  const upperMap: Record<string, PieceType> = {
    K: 'k', Q: 'q', R: 'r', N: 'n', B: 'b',
  };
  if (upperMap[first]) return new Set([upperMap[first]]);

  if (first === 'b') {
    const stripped = orig.replace(/\W/g, '');
    if (stripped.length === 2 && /\d/.test(stripped[1])) return new Set(['p']);
    return new Set(['b', 'p']);
  }

  const lowerPieceMap: Record<string, PieceType> = {
    k: 'k', q: 'q', r: 'r', n: 'n',
  };
  if (lowerPieceMap[first]) return new Set([lowerPieceMap[first]]);

  return new Set(['p']);
}

/**
 * Generates all common written forms of a move so we can fuzzy-match user input.
 * Mirrors get_possible_notations() in Python.
 */
function getPossibleNotations(move: Move): string[] {
  const notations: string[] = [move.san];
  const { piece, from, to, promotion, flags } = move;
  const pieceSymbol = piece === 'p' ? '' : piece.toUpperCase();
  const fromFile = from[0];
  const fromRank = from[1];

  // Castling alternate forms
  if (flags.includes('k')) {
    notations.push('O-O', '0-0', 'o-o', 'oo', '00');
  } else if (flags.includes('q')) {
    notations.push('O-O-O', '0-0-0', 'o-o-o', 'ooo', '000');
  }

  // Destination-only forms
  notations.push(`${pieceSymbol}${to}`, `${pieceSymbol}x${to}`);

  if (piece === 'p') {
    // Pawn captures
    if (flags.includes('c') || flags.includes('e')) {
      notations.push(`${fromFile}${to}`, `${fromFile}x${to}`);
    }
  } else {
    // Disambiguated forms
    notations.push(
      `${pieceSymbol}${fromFile}${to}`,
      `${pieceSymbol}${fromFile}x${to}`,
      `${pieceSymbol}${fromRank}${to}`,
      `${pieceSymbol}${fromRank}x${to}`,
      `${pieceSymbol}${from}${to}`,
      `${pieceSymbol}${from}x${to}`,
    );
  }

  // Promotion alternate forms
  if (promotion) {
    const promo = promotion.toUpperCase();
    const base = [...notations];
    for (const b of base) {
      notations.push(`${b}=${promo}`, `${b}${promo}`, `${b}(${promo})`, `${b}/${promo}`);
    }
  }

  return notations;
}

function findCandidates(chess: Chess, notation: string): Move[] {
  const cleanedUser = cleanNotation(notation);
  if (!cleanedUser) return [];

  const impliedTypes = getImpliedPieceTypes(notation);
  const legalMoves = chess.moves({ verbose: true }) as Move[];
  const candidates: Move[] = [];
  const seen = new Set<string>();

  for (const move of legalMoves) {
    if (!impliedTypes.has(move.piece as PieceType)) continue;
    const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
    for (const form of getPossibleNotations(move)) {
      if (cleanNotation(form) === cleanedUser && !seen.has(uci)) {
        candidates.push(move);
        seen.add(uci);
        break;
      }
    }
  }
  return candidates;
}

function getSuggestions(chess: Chess, userNotation: string): string[] {
  if (!userNotation) return [];
  const legalMoves = chess.moves({ verbose: true }) as Move[];
  const scored = legalMoves.map(m => ({ score: getSimilarity(m.san, userNotation), san: m.san }));
  scored.sort((a, b) => b.score - a.score);
  const unique: string[] = [];
  for (const { san } of scored) {
    if (!unique.includes(san)) {
      unique.push(san);
      if (unique.length >= 3) break;
    }
  }
  return unique;
}

// ─── Main Validator ───────────────────────────────────────────────────────────

export function validateChessMoves(
  rawMoves: Array<{ moveNumber: number; white: unknown; black: unknown }>
): ValidationResult {
  const chess = new Chess();
  const validatedMoves: TurnResult[] = [];
  let isBroken = false;
  let gameIsValid = true;
  const appliedSans: string[] = [];
  const stats = { valid: 0, illegal: 0, ambiguous: 0, missing: 0, recovered: 0 };

  function extractNotation(moveData: unknown): string {
    if (!moveData) return '';
    if (typeof moveData === 'string') return moveData.trim();
    if (typeof moveData === 'object' && moveData !== null) {
      const d = moveData as Record<string, unknown>;
      const val = d.notation ?? d.original;
      if (val != null) return String(val).trim();
    }
    return '';
  }

  for (const turn of rawMoves) {
    const { moveNumber } = turn;
    const whiteNotation = extractNotation(turn.white);
    const blackNotation = extractNotation(turn.black);

    const whiteRes: PlyResult = { original: whiteNotation, status: 'missing', san: null, candidates: [], suggestions: [], fen: null, uci: null };
    const blackRes: PlyResult  = { original: blackNotation, status: 'missing', san: null, candidates: [], suggestions: [], fen: null, uci: null };

    function validatePly(notation: string, plyRes: PlyResult): boolean {
      if (!notation) {
        plyRes.status = 'missing'; stats.missing++; isBroken = true; return false;
      }
      if (isGameResult(notation)) {
        plyRes.status = 'missing'; stats.missing++; isBroken = true; return false;
      }
      if (isBroken) {
        plyRes.status = 'illegal'; stats.illegal++; gameIsValid = false; return false;
      }

      // ── Step 1: Strict SAN parse ──────────────────────────────────────────
      try {
        const move = chess.move(normalizeNotation(notation));
        stats.valid++;
        plyRes.status = 'valid';
        plyRes.san   = move.san;
        plyRes.fen   = chess.fen();
        plyRes.uci   = `${move.from}${move.to}${move.promotion ?? ''}`;
        appliedSans.push(move.san);
        return true;
      } catch { /* fall through */ }

      // ── Step 2: Fuzzy candidate matching ─────────────────────────────────
      const candidates = findCandidates(chess, notation);

      if (candidates.length === 1) {
        const move = chess.move(candidates[0].san);
        stats.valid++;
        plyRes.status = 'valid';
        plyRes.san   = move.san;
        plyRes.fen   = chess.fen();
        plyRes.uci   = `${move.from}${move.to}${move.promotion ?? ''}`;
        appliedSans.push(move.san);
        return true;
      }

      if (candidates.length > 1) {
        const candidateSans = candidates.map(c => c.san);
        const move = chess.move(candidates[0].san);
        plyRes.status     = 'ambiguous';
        plyRes.candidates = candidateSans;
        plyRes.san  = move.san;
        plyRes.fen  = chess.fen();
        plyRes.uci  = `${move.from}${move.to}${move.promotion ?? ''}`;
        stats.ambiguous++; stats.recovered++;
        gameIsValid = false;
        appliedSans.push(move.san);
        return true;
      }

      // ── Step 3: Illegal — suggest closest legal moves & try to recover ────
      const suggestions = getSuggestions(chess, notation);
      plyRes.status      = 'illegal';
      plyRes.suggestions = suggestions;

      if (suggestions.length > 0) {
        try {
          const move = chess.move(suggestions[0]);
          plyRes.san = move.san;
          plyRes.fen = chess.fen();
          plyRes.uci = `${move.from}${move.to}${move.promotion ?? ''}`;
          stats.illegal++; stats.recovered++;
          gameIsValid = false;
          appliedSans.push(move.san);
          return true;
        } catch { /* no recovery */ }
      }

      stats.illegal++;
      isBroken   = true;
      gameIsValid = false;
      return false;
    }

    validatePly(whiteNotation, whiteRes);
    validatePly(blackNotation, blackRes);
    validatedMoves.push({ moveNumber, white: whiteRes, black: blackRes });
  }

  // ── PGN generation ─────────────────────────────────────────────────────────
  let pgn = '';
  if (appliedSans.length > 0) {
    const pgnChess = new Chess();
    for (const san of appliedSans) {
      try { pgnChess.move(san); } catch { break; }
    }
    // Build PGN with a clean, minimal header manually to avoid API version
    // differences. Placeholder tags (Round/White/Black "?") are omitted, and
    // the Date is the actual generation date (zero-padded YYYY.MM.DD).
    const now = new Date();
    const dateTag = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const headers = [
      '[Event "Digitized Scoresheet"]',
      '[Site "GetPGN"]',
      `[Date "${dateTag}"]`,
      '[Result "*"]',
    ].join('\n');
    const movetext = pgnChess
      .pgn()
      .split('\n')
      .filter((line) => !line.trim().startsWith('['))
      .join('\n')
      .trim();
    pgn = `${headers}\n\n${movetext}`;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug(
      `[chess-validator] valid=${stats.valid} illegal=${stats.illegal} ambiguous=${stats.ambiguous} missing=${stats.missing} recovered=${stats.recovered} gameValid=${gameIsValid}`,
    );
  }

  return { valid: gameIsValid, moves: validatedMoves, pgn };
}

/**
 * Handwriting OCR confusions for fuzzy matching only (never mutates displayed originals).
 * Kept conservative — avoid broad rank/file swaps that create false legal matches.
 */

/** Common handwriting file-letter confusions (one swap per variant). */
const FILE_SWAPS: Record<string, string[]> = {
  b: ["h"],
  h: ["b"],
  d: ["a"],
  a: ["d"],
  c: ["e"],
  e: ["c", "d"],
  f: ["d"],
};

/** Common rank misreads on destination / disambiguation digits. */
const RANK_SWAPS: Record<string, string[]> = {
  "1": ["7"],
  "7": ["1"],
  "6": ["8"],
  "8": ["6"],
  "5": ["6"],
};

function swapAtPositions(
  notation: string,
  index: number,
  alts: string[],
): string[] {
  return alts.map(
    (alt) => notation.slice(0, index) + alt + notation.slice(index + 1),
  );
}

function swapConfusableCharsOnce(notation: string): string[] {
  const variants = new Set<string>();
  const lower = notation.toLowerCase();
  for (let i = 0; i < notation.length; i++) {
    const ch = lower[i];
    const fileAlts = FILE_SWAPS[ch];
    if (fileAlts) {
      for (const v of swapAtPositions(notation, i, fileAlts)) variants.add(v);
    }
    if (ch >= "1" && ch <= "8") {
      const rankAlts = RANK_SWAPS[ch];
      if (rankAlts) {
        for (const v of swapAtPositions(notation, i, rankAlts)) variants.add(v);
      }
    }
  }
  return [...variants];
}

/** Well-known SAN shape fixes (not game-specific). */
function structuralVariants(notation: string): string[] {
  const out: string[] = [];
  if (/^[RNBQK][a-h]\+$/.test(notation)) {
    out.push(notation.replace(/\+$/, "1"));
  }
  const bx = notation.match(/^([RNBQ])x([a-h][1-8])/i);
  if (bx) out.push(`${bx[1]}${bx[2]}`);
  const noX = notation.match(/^([RNBQ])([a-h][1-8])$/i);
  if (noX) out.push(`${noX[1]}x${noX[2]}`);
  const nDouble = notation.match(/^(N[a-h])x([a-h][1-8])/i);
  if (nDouble) out.push(`Nx${nDouble[2]}`);
  return out;
}

/** Skip swaps on short pawn moves (e4) — prevents e4→a4 style false positives. */
function shouldExpandOcrVariants(notation: string): boolean {
  const s = notation.trim();
  if (/^O-O(-O)?$/i.test(s)) return true;
  if (/^[RNBQK]/i.test(s)) return true;
  if (/x/i.test(s)) return true;
  if (s.length >= 4) return true;
  return false;
}

/**
 * Expand into OCR-tolerant variants (capped). Used for matching only.
 */
export function expandOcrNotationVariants(notation: string, max = 20): string[] {
  if (!shouldExpandOcrVariants(notation)) return [notation];

  const seen = new Set<string>();
  const queue = [notation];

  while (queue.length > 0 && seen.size < max) {
    const cur = queue.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);

    for (const v of structuralVariants(cur)) {
      if (!seen.has(v) && seen.size < max) queue.push(v);
    }
    for (const v of swapConfusableCharsOnce(cur)) {
      if (!seen.has(v) && seen.size < max) queue.push(v);
    }
  }

  return [...seen];
}

/** Minimum similarity to auto-apply a suggested illegal-move recovery. */
/** Baseline for recoverable notation (clean OCR shapes). */
export const OCR_AUTO_RECOVER_MIN_SIMILARITY = 0.52;

/** Higher bar when the raw string looks heavily corrupted. */
export const OCR_GARBAGE_RECOVER_MIN_SIMILARITY = 0.72;

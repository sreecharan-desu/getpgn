/**
 * Hand-scored benchmark games from public/*.jpg scoresheets.
 * image_pgn = typical raw OCR / model output; optimized = target notation.
 */
export type ScoresheetBenchmarkCase = {
  id: string;
  imagePath: string;
  imagePgn: readonly string[];
  optimizedPgn: readonly string[];
};

export const SCORESHEET_BENCHMARKS: readonly ScoresheetBenchmarkCase[] = [
  {
    id: "5Neo-1",
    imagePath: "/5Neo-1.jpg",
    imagePgn: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3", "Be7", "c3", "d6", "Bb3", "O-O",
      "Nd2", "d5", "Qe2", "dxe4", "dxe4", "h6", "h3", "Bc5", "g4", "a5", "Nf1", "a4",
      "Bc2", "b6", "Ng3", "Ba6", "Qd1", "Bb5", "Qxd8", "Rfxd8", "g5", "hxg5", "Bxg5",
      "Rd6", "Nf5", "Re6", "Rg1", "Ne8", "Nh4",
    ],
    optimizedPgn: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3", "Be7", "c3", "d6", "Bb3", "O-O",
      "Nd2", "d5", "Qe2", "dxe4", "dxe4", "h6", "h3", "Bc5", "g4", "a5", "Nf1", "a4",
      "Bc2", "b6", "Ng3", "Ba6", "Qd1", "Bb5", "Qxd8", "Rfxd8", "g5", "hxg5", "Bxg5",
      "Rd6", "Nf5", "Re6", "Rg1", "Ne8", "Nh4",
    ],
  },
  {
    id: "77YJ-1",
    imagePath: "/77YJ-1.jpg",
    imagePgn: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+",
      "Bd2", "Nxe4", "Bxb4", "Nxb4", "Bxf7+", "Kf8", "Qb3", "Qe7", "O-O", "a5", "Bd5",
      "c6", "Bxe4", "Qxe4", "Nc3", "Qe7", "Rfe1", "a4", "Nxa4", "Qd6", "Ne5", "Nd5",
      "Nb6", "Ra6", "Nxc8", "Qf6", "Nxd7", "Kf7", "Nxf6", "Rxc8", "Qxb7+", "Kxf6",
      "Qxa6", "Rc7", "Rc1", "Nb4", "Qe2", "Nxa2", "Qd6+", "Kg5", "Rc5+", "Kf4", "Re4#",
    ],
    optimizedPgn: [
      "e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+",
      "Bd2", "Nxe4", "Bxb4", "Nxb4", "Bxf7+", "Kf8", "Qb3", "Qe7", "O-O", "a5", "Bd5",
      "c6", "Bxe4", "Qxe4", "Nc3", "Qe7", "Rfe1", "a4", "Nxa4", "Qa6", "Ne5", "Na5",
      "Nb6", "Ra6", "Nxc8", "Qf6", "Nxd7", "Kf7", "Nxf6", "Rxc8", "Qxb7+", "Kxf6",
      "Qxa6", "Rc7", "Rc1", "Nb4", "Qe2", "Nxa2", "Qd6+", "Kg5", "Rc5+", "Kf4", "Re4#",
    ],
  },
  {
    id: "Littleboy-1",
    imagePath: "/Littleboy-1.jpg",
    imagePgn: [
      "e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3", "Qb6", "Be2", "Bd7",
      "O-O", "Nge7", "dxc5", "Qxc5", "Be3", "Qa5", "b4", "Qc7", "Bf4", "Ng6", "Bg3",
      "Ncxe5", "Qd4", "Bd6", "Nxe5", "Bxe5", "Bxe5", "Qxe5", "Qd2", "O-O", "Na3", "Rc8",
      "Rac1", "Bc6", "b5", "Bd2", "c4", "Nf4", "Bf3", "Rfd8", "Rfe1", "Qf5", "cxd5",
      "Rxc1", "Rxc1", "Nxd5", "Qa5", "Ra8", "b6", "Nxb6", "Bxb7", "Qxa5", "Bxa8",
      "Qxa3", "Rd1", "Kf8",
    ],
    optimizedPgn: [
      "e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3", "Qb6", "Be2", "Bd7",
      "O-O", "Nge7", "dxc5", "Qxc5", "Be3", "Qa5", "b4", "Qc7", "Bf4", "Ng6", "Bg3",
      "Ncxd5", "Qd4", "Bd6", "Nxe5", "Bxe5", "Bxe5", "Qxe5", "Qd2", "O-O", "Na3", "Rc8",
      "Rac1", "Bc6", "b5", "Bd2", "c4", "Nf4", "Bf3", "Rfd8", "Rfe1", "Qf5", "cxd5",
      "Rxc1", "Rxc1", "Nxd5", "Qa5", "Ra8", "b6", "Nxb6", "Bxb7", "Qxa5", "Bxa8",
      "Qxa3", "Rd1", "Kf8",
    ],
  },
  {
    id: "Max1a-1",
    imagePath: "/Max1a-1.jpg",
    imagePgn: [
      "g3", "e5", "c4", "Nf6", "Bg2", "Bc5", "d3", "d6", "Nf3", "Nc6", "O-O", "h6",
      "Nc3", "O-O", "Nd2", "Bd7", "Nde4", "Bb4", "a3", "Bxc3", "bxc3", "Nxe4", "Be4",
      "Bh3", "Re1", "Qd7", "Rb1", "Rab8", "Be3", "a6", "Qa4", "Rfd8", "Rb2", "Ne7",
      "Qxd7", "Rxd7", "Rxb7", "Rxb7", "Bxb7", "c6", "Bxa6", "Rd8", "c5", "d5", "Rb1",
      "e4", "dxe4", "dxe4", "Bc4", "Nf5", "Bf4", "g5", "Rb8", "Rxb8", "Bxb8", "e3",
      "Ba6", "exf2+", "Kxf2", "Ne7",
    ],
    optimizedPgn: [
      "g3", "e5", "c4", "Nf6", "Bg2", "Bc5", "d3", "d6", "Nf3", "Nc6", "O-O", "h6",
      "Nc3", "O-O", "Nd2", "Bd7", "Nde4", "Bb4", "a3", "Bxc3", "bxc3", "Nxe4", "Be4",
      "Bb3", "Re1", "Qd7", "Rb1", "Rab8", "Be3", "a6", "Qa4", "Rfd8", "Rb2", "Ne7",
      "Qxd7", "Rxd7", "Rxb7", "Rxb7", "Bxb7", "c6", "Ba6", "Rd8", "c5", "d5", "Rb1",
      "e4", "dxe4", "dxe4", "Bc4", "Nf5", "Bf4", "g5", "Rb8", "Rxb8", "Bxb8", "e3",
      "Ba6", "exf2+", "Kxf2", "Ne7",
    ],
  },
  {
    id: "MopntA-1",
    imagePath: "/MopntA-1.jpg",
    imagePgn: [
      "e4", "c5", "Nf3", "g6", "d3", "Bg7", "Nbd2", "Nc6", "g3", "d6", "Bg2", "Nf6",
      "O-O", "O-O", "Re1", "Bg4", "h3", "Bxf3", "Nxf3", "Re8", "Be3", "Rc8", "Qd2",
      "Qb6", "Rab1", "Qa6", "a3", "c4", "Bf4", "cxd3", "cxd3", "Nh5", "Be3", "Ne5",
      "Nxe5", "Bxe5", "d4", "Bg7", "Bf1", "Qc6", "Bd3", "Nf6", "d5", "Qd7", "Kg2", "a6",
      "b4", "e6", "dxe6", "Qxe6", "f3", "d5", "Bd4", "dxe4", "fxe4", "Red8", "Bxf6",
      "Bxf6", "Qe2", "Rc3", "Rbd1", "Qd6", "e5", "Bxe5", "Qxe5", "Rxd3", "Qxd6",
      "R8xd6", "Rxd3", "Rd3", "a4", "Rd4", "Rb1", "a5", "bxa5", "Rxa4", "Rxb7", "Rxa5",
      "g4", "Kg7", "Kg3", "Ra3+", "Kg2", "Ra6", "Kg3", "Rf6", "g5", "Rf5", "Kg4", "Rf1",
      "Rc7", "Rg1+", "Kh4", "h6", "Rc5", "hxg5+", "Rxg5", "Rxg5", "Kxg5", "Kh7",
    ],
    optimizedPgn: [
      "e4", "c5", "Nf3", "g6", "d3", "Bg7", "Nbd2", "Nc6", "g3", "d6", "Bg2", "Nf6",
      "O-O", "O-O", "Re1", "Bg4", "h3", "Bxf3", "Nxf3", "Re8", "Be3", "Re8", "Qd2",
      "Qb6", "Rab1", "Qa6", "a3", "c4", "Bf4", "cxd3", "cxd3", "Na5", "Be3", "Ne7",
      "Nxe8", "Bxe8", "d4", "Bg7", "Bf1", "Qc6", "Bd3", "Nf6", "d5", "Qd7", "Kg2", "a6",
      "b4", "e6", "dxe6", "Qxe6", "f3", "d5", "Bh4", "Nce7", "fxe4", "Re8", "Bxf6",
      "Bxf6", "Qe2", "Rc3", "Rbd1", "Qd6", "e5", "Bxe5", "Qxe5", "Rxd3", "Qxd6", "Re4",
      "Rxd3", "Rxd3", "a4", "Rd4", "Rb1", "a5", "bxa5", "Rxa4", "Rxb7", "Rxa5", "g4",
      "Kg7", "Kg3", "Ra3+", "Kg2", "Ra6", "Kg3", "Rf6", "g5", "Rf5", "Kg4", "Rf1",
      "Rc7", "Rg1+", "Kh4", "h6", "Rc5", "hxg5+", "Rxg5", "Rxg5+", "Kxg5", "Kh7",
    ],
  },
] as const;

/** Flat SAN list → validator raw turns. */
export function sanListToRawMoves(sans: readonly string[]) {
  const moves: { moveNumber: number; white: string; black: string }[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    moves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: sans[i] ?? "",
      black: sans[i + 1] ?? "",
    });
  }
  return moves;
}

export function flattenValidatedSans(
  turns: Array<{ white: { san: string | null }; black: { san: string | null } }>,
): string[] {
  const out: string[] = [];
  for (const t of turns) {
    if (t.white.san) out.push(t.white.san);
    if (t.black.san) out.push(t.black.san);
  }
  return out;
}

export function moveListSimilarity(
  actual: readonly string[],
  expected: readonly string[],
): number {
  const n = Math.max(actual.length, expected.length);
  if (n === 0) return 1;
  let matches = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] === expected[i]) matches++;
  }
  return matches / n;
}

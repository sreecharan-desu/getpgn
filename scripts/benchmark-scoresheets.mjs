#!/usr/bin/env node
/**
 * Measure how well validation recovers benchmark OCR moves toward ground truth.
 * Usage: npx tsx scripts/benchmark-scoresheets.mjs
 */
import {
  SCORESHEET_BENCHMARKS,
  sanListToRawMoves,
  flattenValidatedSans,
  moveListSimilarity,
} from "../src/lib/scoresheetBenchmark.ts";
import { validateChessMoves } from "../src/lib/chess-validator.ts";

function plyStats(turns) {
  let valid = 0;
  let ambiguous = 0;
  let illegal = 0;
  let missing = 0;
  for (const t of turns) {
    for (const p of [t.white, t.black]) {
      if (p.status === "valid") valid++;
      else if (p.status === "ambiguous") ambiguous++;
      else if (p.status === "illegal") illegal++;
      else missing++;
    }
  }
  return { valid, ambiguous, illegal, missing };
}

console.log("Scoresheet benchmark — validation recovery\n");

let totalSim = 0;
let totalCases = 0;

for (const bench of SCORESHEET_BENCHMARKS) {
  const raw = sanListToRawMoves(bench.imagePgn);
  const result = validateChessMoves(raw);
  const recovered = flattenValidatedSans(result.moves);
  const sim = moveListSimilarity(recovered, bench.optimizedPgn);
  const stats = plyStats(result.moves);

  totalSim += sim;
  totalCases++;

  const mismatches = [];
  const n = Math.max(recovered.length, bench.optimizedPgn.length);
  for (let i = 0; i < n; i++) {
    if (recovered[i] !== bench.optimizedPgn[i]) {
      mismatches.push({
        i: i + 1,
        ocr: bench.imagePgn[i] ?? "—",
        got: recovered[i] ?? "—",
        want: bench.optimizedPgn[i] ?? "—",
      });
    }
  }

  console.log(
    `${bench.id}: similarity ${(sim * 100).toFixed(1)}% | valid ${stats.valid} amb ${stats.ambiguous} ill ${stats.illegal}`,
  );
  if (mismatches.length > 0 && mismatches.length <= 12) {
    for (const m of mismatches) {
      console.log(`  ply ${m.i}: OCR "${m.ocr}" → "${m.got}" (want "${m.want}")`);
    }
  } else if (mismatches.length > 12) {
    console.log(`  ${mismatches.length} mismatches (first 8):`);
    for (const m of mismatches.slice(0, 8)) {
      console.log(`  ply ${m.i}: OCR "${m.ocr}" → "${m.got}" (want "${m.want}")`);
    }
  }
  console.log("");
}

console.log(
  `Average similarity: ${((totalSim / totalCases) * 100).toFixed(1)}% across ${totalCases} games`,
);

#!/usr/bin/env node
/**
 * offline benchmark of the move validator on the 5 hand-scored scoresheets in
 * src/lib/scoresheetBenchmark.ts. no model call: the "ocr" input is the stored
 * imagePgn for each sheet. reports raw vs validated similarity to ground truth
 * and validator latency.
 * usage: npx tsx benchmarks/validator-bench.mjs [iterations]
 */
import os from "node:os";
import {
  SCORESHEET_BENCHMARKS,
  sanListToRawMoves,
  flattenValidatedSans,
  moveListSimilarity,
} from "../src/lib/scoresheetBenchmark.ts";
import { validateChessMoves } from "../src/lib/chess-validator.ts";

const iterations = Number(process.argv[2] || 200);
const quiet = () => {};
const pct = (x) => `${(x * 100).toFixed(1)}%`;

console.log(`date: ${new Date().toISOString()}`);
console.log(`cpu: ${os.cpus().length} x ${os.cpus()[0].model}`);
console.log(`ram_mb: ${Math.round(os.totalmem() / 2 ** 20)}`);
console.log(`os: ${os.type()} ${os.release()} · node ${process.version}`);
console.log(`iterations per sheet: ${iterations}\n`);
console.log("sheet | plies | raw vs truth | validated vs truth | p50 ms | p95 ms");

let rawSum = 0;
let valSum = 0;
const all = [];
for (const b of SCORESHEET_BENCHMARKS) {
  const raw = sanListToRawMoves(b.imagePgn);
  const rawSim = moveListSimilarity([...b.imagePgn], b.optimizedPgn);
  const log = console.log;
  const dbg = console.debug;
  console.log = console.debug = quiet; // validator prints a summary line per call
  const res = validateChessMoves(raw);
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t = performance.now();
    validateChessMoves(raw);
    times.push(performance.now() - t);
  }
  console.log = log;
  console.debug = dbg;
  const valSim = moveListSimilarity(flattenValidatedSans(res.moves), b.optimizedPgn);
  times.sort((x, y) => x - y);
  const q = (p) => times[Math.min(times.length - 1, Math.floor(p * times.length))];
  all.push(...times);
  rawSum += rawSim;
  valSum += valSim;
  console.log(
    `${b.id} | ${b.optimizedPgn.length} | ${pct(rawSim)} | ${pct(valSim)} | ${q(0.5).toFixed(2)} | ${q(0.95).toFixed(2)}`,
  );
}
all.sort((x, y) => x - y);
const n = SCORESHEET_BENCHMARKS.length;
console.log(
  `\naverage | | ${pct(rawSum / n)} | ${pct(valSum / n)} | ${all[Math.floor(0.5 * all.length)].toFixed(2)} | ${all[Math.floor(0.95 * all.length)].toFixed(2)}`,
);

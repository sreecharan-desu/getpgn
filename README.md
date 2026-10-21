# getpgn

turns photos of handwritten chess scoresheets into pgn.

live: [getpgn.in](https://getpgn.in) · maintainer: [@azeezchess](https://github.com/azeezchess)

## features

- extracts move lists from scoresheet photos or scans with a multimodal model
- validates moves with `python-chess` and generates fen
- interactive board to play through the game (chessground + `chess.js`)
- public share links for games
- saved games dashboard with title search
- premium tier through razorpay subscriptions

## stack

next.js 15 · react 19 · prisma + postgres · gemini · python-chess · resend · razorpay · tailwind css

## run locally

needs node 18+, python 3.10+ and postgres.

```bash
npm install
npm run setup:python      # python venv + python-chess
cp .env.example .env
npm run db:sync           # prisma generate + db push
npm run dev
```

## env

copy `.env.example` to `.env`.

## local benchmark

offline run of the move validator on the 5 hand-scored scoresheets in `public/` (fixtures in `src/lib/scoresheetBenchmark.ts`). no model call: the input is the stored ocr output for each sheet, so this measures validation only, not extraction. single run, 20 oct 2026, one 8 vCPU Intel Xeon / 16 GB box, Linux 6.12, node 22.23. raw output: [`benchmarks/results-2026-10-20/`](benchmarks/results-2026-10-20/), environment: [`environment.txt`](benchmarks/results-2026-10-20/environment.txt), reproduce: `npx tsx benchmarks/validator-bench.mjs 200`.

| sheet | plies | raw ocr vs truth | after validation | p50 | p95 |
| --- | --- | --- | --- | --- | --- |
| 5Neo-1 | 41 | 100.0% | 97.6% | 9.8 ms | 11.1 ms |
| 77YJ-1 | 55 | 96.4% | 90.9% | 19.3 ms | 21.1 ms |
| Littleboy-1 | 58 | 98.3% | 94.8% | 21.5 ms | 27.5 ms |
| Max1a-1 | 60 | 96.7% | 95.0% | 12.7 ms | 15.0 ms |
| MopntA-1 | 100 | 89.0% | 90.0% | 37.8 ms | 45.6 ms |
| average | | 96.1% | 93.7% | 18.7 ms | 39.8 ms |

similarity is per-ply agreement with the hand-scored game, latency is 200 runs per sheet. on 4 of 5 sheets validation moved the output further from the hand-scored notation, partly by adding disambiguation or check marks (`Nd2` → `Nfd2`, `Nxd7` → `Nxd7+`). five games is a small sample; these are not accuracy numbers for real uploads.

---

built by [sreecharan desu](https://www.sreecharandesu.in) · [more projects](https://www.sreecharandesu.in/work)

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

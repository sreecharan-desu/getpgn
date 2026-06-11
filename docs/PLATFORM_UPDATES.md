# Platform Updates — Deployment Guide

This document covers database changes, new APIs, environment variables, and deployment steps for the homepage, player names, Enterprise plan, referral system, and branding updates.

## Database changes

**Policy: additive-only, no data loss.** See [`docs/DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) for the full workflow and future-change checklist.

Run before deploy (safe — **does not delete existing rows**, only adds columns/tables):

```bash
npm run db:sync
npm run db:check
```

Manual SQL alternative (idempotent): `prisma/safe-additive-migration.sql`  
Runtime expectations: `scripts/schema-manifest.mjs`

### Schema (`prisma/schema.prisma`)

| Change | Details |
|--------|---------|
| `Plan` enum | Added `ENTERPRISE` |
| `User.bonusScanCount` | Referral reward scans |
| `User.referralCode` | Unique referral code per user |
| `User.referredById` | Referrer link (signup attribution) |
| `User.avatarPiece` | Chess-piece avatar (`king`…`pawn`, default `queen`) |
| `SavedGame.whitePlayer` / `blackPlayer` | Required player names on save |
| `OrganizerLibrary` | Enterprise public game library |
| `Referral` | Referral lifecycle tracking |

Existing users receive a `referralCode` lazily on first `/api/referral` request or via `ensureReferralCode`.

## New APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/referral` | GET | Referral code, link, recent referrals (auth required) |
| `/api/library/share` | GET/POST | Enterprise organizer library settings |
| `/library/[slug]` | Page | Public browse of organizer shared games |

### Updated APIs

- `POST /api/games/save` — requires `whitePlayer` and `blackPlayer`
- `POST /api/auth/signup` — accepts optional `referralCode` (or `?ref=` on signup page)
- `POST /api/extract` — completes referral reward on first successful scan
- `POST /api/subscription/create` — accepts `plan: "enterprise"`
- Subscription verify + Razorpay webhook — assign `ENTERPRISE` plan when applicable

## Environment variables

### Plan catalog (server — optional overrides)

```env
PLAN_MONTHLY_PRICE_INR=100
PLAN_YEARLY_PRICE_INR=1000
PLAN_ENTERPRISE_PRICE_INR=4000
PLAN_MONTHLY_SCAN_LIMIT=100
PLAN_YEARLY_SCAN_LIMIT=1000
PLAN_ENTERPRISE_SCAN_LIMIT=4000
```

### Plan display (client build-time)

```env
NEXT_PUBLIC_PLAN_MONTHLY_PRICE_INR=100
NEXT_PUBLIC_PLAN_YEARLY_PRICE_INR=1000
NEXT_PUBLIC_PLAN_ENTERPRISE_PRICE_INR=4000
NEXT_PUBLIC_PLAN_MONTHLY_SCAN_LIMIT=100
NEXT_PUBLIC_PLAN_YEARLY_SCAN_LIMIT=1000
NEXT_PUBLIC_PLAN_ENTERPRISE_SCAN_LIMIT=4000
```

### Razorpay

```env
RAZORPAY_ENTERPRISE_PLAN_ID=plan_xxx
```

Create via:

```bash
node --env-file=.env scripts/razorpay-setup-plans.mjs
```

### Homepage content

```env
NEXT_PUBLIC_HOME_VIDEO_URL=          # YouTube/Vimeo/direct URL when ready
NEXT_PUBLIC_HOME_VIDEO_POSTER_URL=   # Optional video poster
NEXT_PUBLIC_SHOWCASE_SCORESHEET_URL= # Defaults to /showcase/scoresheet.jpg
NEXT_PUBLIC_SHOWCASE_PGN_URL=        # Defaults to /showcase/pgn-output.png
```

## Deployment checklist

1. `npm run db:sync` on production database
2. Set `RAZORPAY_ENTERPRISE_PLAN_ID` in Vercel/hosting env
3. Optionally set plan pricing/limit env vars
4. Deploy — `public/og-image.png` and `public/favicon.svg` ship with the build
5. Verify referral flow: signup with `?ref=CODE` → verify email → first scan → +2 scans each
6. Verify Enterprise checkout → organizer library at Account → enable public link → `/library/[slug]`

## Enterprise scan limits (dynamic model)

**Base tier (default for all Enterprise subscribers):**

```env
PLAN_ENTERPRISE_SCAN_LIMIT=4000   # scans per year
PLAN_ENTERPRISE_PRICE_INR=4000
```

Change these env vars and redeploy to adjust the **default** Enterprise offering globally. No code changes.

**When one organizer exhausts their quota:**

| Approach | How | Best for |
|----------|-----|----------|
| **Bonus scans** (built-in) | Increase `bonus_scan_count` on their `User` row | One-off top-ups (+N scans on top of base limit) |
| **Global limit change** | Raise `PLAN_ENTERPRISE_SCAN_LIMIT` in env | All Enterprise customers get a higher cap |
| **Custom contract** (future) | Per-user `customScanLimit` column or scan-pack checkout | Large organizers with negotiated limits |

Today, effective limit = `PLAN_ENTERPRISE_SCAN_LIMIT` + `bonusScanCount` (referrals also add to `bonusScanCount`).

Example: organizer used 4,000/4,000 → grant +2,000 bonus scans in DB → they can scan 2,000 more this year without changing global pricing.

**Renewal:** Enterprise uses a yearly billing period; `monthlyScanCount` resets when the calendar year key changes (or on subscription renewal via Razorpay webhook).

## Referral rules

- Each user gets a unique code and `https://getpgn.in/signup?ref=CODE` link
- Reward (+2 `bonusScanCount` each) after: signup via link → email verified → first successful extract
- Self-referrals, duplicate referrals, and repeat rewards are blocked

## Footer

Site-wide footer text:

> Built by Chess Coaches. Powered by ABCChess Education LLP.

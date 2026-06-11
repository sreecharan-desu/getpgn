# Database schema — safe changes (no data loss)

GetPGN uses **additive-only** schema evolution. Existing users, games, subscriptions, and billing data must never be wiped by a deploy or migration.

## Golden rules

1. **Never** run `prisma migrate reset`, `db push --force-reset`, or `DROP TABLE` / `DROP COLUMN` on production.
2. **Never** put `prisma db push` in the production **build** step — schema sync is a deliberate pre-deploy action against the live DB.
3. **Always** add new fields with `@default(...)` or make them optional (`?`) so existing rows remain valid.
4. **Always** use `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` in manual SQL.
5. After any schema change, run **`npm run db:check`** before shipping.

## Workflow for every schema change

| Step | Action |
|------|--------|
| 1 | Edit `prisma/schema.prisma` (additive only) |
| 2 | Add matching entry to `scripts/schema-manifest.mjs` |
| 3 | Append idempotent SQL to `prisma/safe-additive-migration.sql` |
| 4 | Update `src/lib/dbSelects.ts` / `SessionUser` if the app reads the field |
| 5 | Run `npm run db:sync` against your dev/staging DB |
| 6 | Run `npm run db:check` — must pass |
| 7 | Confirm user/game counts unchanged (`prisma.user.count()`, spot-check) |
| 8 | Before production deploy: `npm run db:sync` against **production** `DATABASE_URL` |
| 9 | Deploy application code |

## Commands

```bash
# Apply schema to the database pointed at by DATABASE_URL (additive)
npm run db:sync

# Verify env + DB connectivity + manifest columns/tables/enums
npm run db:check
```

### What `db:sync` does

```
prisma generate && prisma db push && prisma generate
```

`db push` compares `schema.prisma` to the live database and applies **non-destructive** diffs (add columns, add tables, add enum values). It does not delete data when you only add fields.

### Manual SQL (optional)

`prisma/safe-additive-migration.sql` — idempotent script for DBA-controlled runs. Safe to execute multiple times.

## Files to keep in sync

| File | Role |
|------|------|
| `prisma/schema.prisma` | Source of truth for Prisma Client |
| `scripts/schema-manifest.mjs` | Runtime expectations checked by `db:check` |
| `prisma/safe-additive-migration.sql` | Manual/idempotent SQL mirror |
| `src/lib/dbSelects.ts` | Columns fetched per request |
| `src/lib/session.ts` | `SessionUser` type |

## If schema is behind the app

Symptoms:

- Login redirect to `/login?error=schema`
- Dashboard redirect with schema error
- Server log: `Database schema is out of sync (missing column)`

Fix (local or production):

```bash
npm run db:sync
npm run db:check
```

## Destructive changes (rare)

If you truly must rename or remove a column:

1. Ship a **two-phase** change: add new column → backfill in app/script → deploy readers → later deprecate old column.
2. Do **not** drop the old column until no code path reads it.
3. Document the rollout in `docs/PLATFORM_UPDATES.md`.

## Current additive manifest

Maintained in `scripts/schema-manifest.mjs`:

- **User:** `bonus_scan_count`, `referral_code`, `referred_by_id`, `avatar_piece`
- **SavedGame:** `white_player`, `black_player`
- **Tables:** `organizer_libraries`, `referrals`
- **Plan enum:** `ENTERPRISE`

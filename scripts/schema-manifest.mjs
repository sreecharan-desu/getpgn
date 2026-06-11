/**
 * Canonical list of additive schema changes the app expects at runtime.
 *
 * When you add a column or table in prisma/schema.prisma:
 * 1. Add the matching entry here (DB column/table name).
 * 2. Append idempotent SQL to prisma/safe-additive-migration.sql.
 * 3. Run npm run db:sync locally, then npm run db:check.
 * 4. Update docs/DATABASE_SCHEMA.md if the change is non-trivial.
 *
 * Only list ADDITIVE expectations — never destructive drops/renames here.
 */

/** @type {Record<string, string[]>} */
export const REQUIRED_COLUMNS = {
  User: [
    'bonus_scan_count',
    'referral_code',
    'referred_by_id',
    'avatar_piece',
    'user_role',
    'onboarding_completed',
  ],
  SavedGame: ['white_player', 'black_player', 'is_draft'],
};

/** Tables created after the initial MVP schema. */
export const REQUIRED_TABLES = [
  'organizer_libraries',
  'referrals',
  'organizer_accounts',
  'organizer_purchases',
];

/** PostgreSQL enum values that must exist on Plan (additive only). */
export const REQUIRED_ENUM_VALUES = {
  Plan: ['ENTERPRISE'],
};

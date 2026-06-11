-- Safe additive migration for GetPGN platform updates.
-- Idempotent: safe to run multiple times. Does NOT delete existing data.
-- Prefer: npm run db:sync (Prisma db push). Use this SQL only if you need manual control.

-- Plan enum value (PostgreSQL)
DO $$ BEGIN
  ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'ENTERPRISE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User: referral & bonus scans
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonus_scan_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referred_by_id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar_piece" TEXT NOT NULL DEFAULT 'queen';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "user_role" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
-- Existing verified users skip onboarding
UPDATE "User" SET onboarding_completed = true WHERE email_verified = true AND onboarding_completed = false;

-- Email optional until user completes signup step 3
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referral_code_key" ON "User"("referral_code");
CREATE INDEX IF NOT EXISTS "User_referred_by_id_idx" ON "User"("referred_by_id");

-- SavedGame: player names (empty string default for existing rows)
ALTER TABLE "SavedGame" ADD COLUMN IF NOT EXISTS "white_player" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SavedGame" ADD COLUMN IF NOT EXISTS "black_player" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "SavedGame_white_player_idx" ON "SavedGame"("white_player");
CREATE INDEX IF NOT EXISTS "SavedGame_black_player_idx" ON "SavedGame"("black_player");

-- SavedGame: scan drafts (temporary until user confirms save)
ALTER TABLE "SavedGame" ADD COLUMN IF NOT EXISTS "is_draft" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "SavedGame_user_id_is_draft_idx" ON "SavedGame"("userId", "is_draft");

-- Organizer libraries (Enterprise)
CREATE TABLE IF NOT EXISTS "organizer_libraries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizer_libraries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizer_libraries_user_id_key" ON "organizer_libraries"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "organizer_libraries_slug_key" ON "organizer_libraries"("slug");

-- Referrals
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL,
  "referrer_id" TEXT NOT NULL,
  "referee_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "referrer_rewarded" BOOLEAN NOT NULL DEFAULT false,
  "referee_rewarded" BOOLEAN NOT NULL DEFAULT false,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referee_id_key" ON "referrals"("referee_id");
CREATE INDEX IF NOT EXISTS "referrals_referrer_id_idx" ON "referrals"("referrer_id");
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referee_bonus_acknowledged_at" TIMESTAMP(3);

-- Organizer prepaid scan wallet (Razorpay Orders)
DO $$ BEGIN
  CREATE TYPE "OrganizerPurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "organizer_accounts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "available_scans" INTEGER NOT NULL DEFAULT 0,
  "total_scans_purchased" INTEGER NOT NULL DEFAULT 0,
  "total_scans_used" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizer_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizer_accounts_user_id_key" ON "organizer_accounts"("user_id");

CREATE TABLE IF NOT EXISTS "organizer_purchases" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "scans_purchased" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "razorpay_order_id" TEXT NOT NULL,
  "razorpay_payment_id" TEXT,
  "status" "OrganizerPurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "organizer_purchases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organizer_purchases_razorpay_order_id_key" ON "organizer_purchases"("razorpay_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "organizer_purchases_razorpay_payment_id_key" ON "organizer_purchases"("razorpay_payment_id");
CREATE INDEX IF NOT EXISTS "organizer_purchases_user_id_created_at_idx" ON "organizer_purchases"("user_id", "created_at" DESC);

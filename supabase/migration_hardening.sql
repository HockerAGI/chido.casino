-- ============================================================
-- CHIDO CASINO — Production Hardening Migration
-- Adds missing columns/tables and hardens schema for real launch.
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query).
-- Idempotent: safe to re-run.
-- ============================================================

-- 1) Daily streak tracking table (profiles table doesn't have streak columns)
CREATE TABLE IF NOT EXISTS daily_streak_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  streak_count integer NOT NULL DEFAULT 1,
  reward_amount numeric NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_streak_claims_user_unique UNIQUE (user_id, claimed_at)
);

-- Index for fast "last claim" lookups
CREATE INDEX IF NOT EXISTS idx_daily_streak_claims_user
  ON daily_streak_claims (user_id, claimed_at DESC);

-- RLS for daily_streak_claims
ALTER TABLE daily_streak_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_streak_claims_user_select" ON daily_streak_claims;
CREATE POLICY "daily_streak_claims_user_select" ON daily_streak_claims
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "daily_streak_claims_service_role_all" ON daily_streak_claims;
CREATE POLICY "daily_streak_claims_service_role_all" ON daily_streak_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) Fix transactions_audit: the table already exists with columns
--    (id, transaction_id, changed_by, action, payload, created_at)
--    The set-kyc route was inserting wrong columns (user_id, metadata).
--    Code is fixed to use the correct columns. No DDL needed here.

-- 3) Mercado Pago deposit tracking
-- deposit_intents already exists and supports provider='mercadopago'.
-- No new tables needed — we reuse deposit_intents with provider='mercadopago'.

-- 4) Ensure profiles has the columns we reference for cashback/day tracking
-- (cashback_day, cashback_day_total, cashback_week_start, cashback_week_total already exist)
-- No changes needed.

-- 5) Add 'mercadopago' to allowed provider values in withdraw_requests if needed
-- (provider column is text, no enum constraint — already flexible)

-- ============================================================
-- Done. All changes are additive and idempotent.
-- ============================================================

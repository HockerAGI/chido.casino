-- ================================================================
-- Migration: transactions optimizations, enums, RLS policies,
-- secure insert function and audit trigger
-- Date: (generated)
-- ================================================================

-- 1) Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at);

-- 2) Create ENUM types (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE public.transaction_type AS ENUM ('deposit','withdraw','bet','win');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE public.transaction_status AS ENUM ('pending','completed','failed','cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_method') THEN
    CREATE TYPE public.transaction_method AS ENUM ('stripe','paypal','crypto','manual');
  END IF;
END
$$;

-- 3) Convert text columns to ENUM types safely by creating temp columns and swapping
-- Note: this preserves existing values that match enum labels; if rows contain values
-- not present in the enum, the UPDATE will fail. Ensure frontend/backend data matches enums.

-- type -> transaction_type
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type_new public.transaction_type;
UPDATE public.transactions SET type_new = type::text::public.transaction_type;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS type;
ALTER TABLE public.transactions RENAME COLUMN type_new TO type;

-- status -> transaction_status
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status_new public.transaction_status;
UPDATE public.transactions SET status_new = status::text::public.transaction_status;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS status;
ALTER TABLE public.transactions RENAME COLUMN status_new TO status;

-- method -> transaction_method
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS method_new public.transaction_method;
UPDATE public.transactions SET method_new = method::text::public.transaction_method;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS method;
ALTER TABLE public.transactions RENAME COLUMN method_new TO method;

-- 4) Add additional enum values to transaction_method required by frontend
-- (if they do not already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'transaction_method' AND e.enumlabel = 'spei') THEN
    ALTER TYPE public.transaction_method ADD VALUE 'spei';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'transaction_method' AND e.enumlabel = 'oxxo') THEN
    ALTER TYPE public.transaction_method ADD VALUE 'oxxo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'transaction_method' AND e.enumlabel = 'card') THEN
    ALTER TYPE public.transaction_method ADD VALUE 'card';
  END IF;
END
$$;

-- 5) RLS policies for public.transactions
-- Ensure RLS is enabled if you intend to use policies (optional if already enabled)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policy with the same name to ensure idempotency
DROP POLICY IF EXISTS "User Transactions" ON public.transactions;

-- Allow authenticated users to SELECT only their own rows
CREATE POLICY "User Transactions" ON public.transactions
  FOR SELECT
  TO authenticated
  USING ((auth.uid()) = user_id);

-- Explicitly block INSERT/UPDATE/DELETE for authenticated role
-- These policies cause writes by authenticated users to fail (they evaluate to false).
DROP POLICY IF EXISTS "block_insert_for_authenticated" ON public.transactions;
CREATE POLICY "block_insert_for_authenticated" ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_update_for_authenticated" ON public.transactions;
CREATE POLICY "block_update_for_authenticated" ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "block_delete_for_authenticated" ON public.transactions;
CREATE POLICY "block_delete_for_authenticated" ON public.transactions
  FOR DELETE
  TO authenticated
  USING (false);

-- Important: service_role (the Supabase service key) bypasses RLS; ensure only trusted backends use it.

-- 6) Create audit table for transactions
CREATE TABLE IF NOT EXISTS public.transactions_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid,
  changed_by text,
  action text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 7) Create SECURITY DEFINER function for secure inserts
-- This function does basic validations and inserts a row into transactions,
-- then logs the insertion into transactions_audit.
CREATE OR REPLACE FUNCTION public.secure_insert_transaction(
  p_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_type public.transaction_type,
  p_status public.transaction_status,
  p_method public.transaction_method,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id uuid := p_id;
BEGIN
  -- Basic validations
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  IF new_id IS NULL THEN
    new_id := gen_random_uuid();
  END IF;

  -- Insert into transactions (adjust column list if your table differs)
  INSERT INTO public.transactions(id, user_id, amount, type, status, method, metadata, created_at, updated_at)
  VALUES (new_id, p_user_id, p_amount, p_type, p_status, p_method, p_metadata, now(), now());

  -- Log audit
  INSERT INTO public.transactions_audit(transaction_id, changed_by, action, payload)
  VALUES (new_id, current_user, 'insert', jsonb_build_object(
    'user_id', p_user_id,
    'amount', p_amount,
    'type', p_type,
    'method', p_method,
    'status', p_status,
    'metadata', p_metadata
  ));

  RETURN new_id;
END;
$$;

-- 8) Revoke execute from PUBLIC and grant to postgres (or another admin role you prefer)
REVOKE EXECUTE ON FUNCTION public.secure_insert_transaction(uuid, uuid, numeric, public.transaction_type, public.transaction_status, public.transaction_method, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_insert_transaction(uuid, uuid, numeric, public.transaction_type, public.transaction_status, public.transaction_method, jsonb) TO postgres;

-- 9) Create trigger function to audit all inserts on transactions
CREATE OR REPLACE FUNCTION public.transactions_insert_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.transactions_audit(transaction_id, changed_by, action, payload)
  VALUES (NEW.id, current_user, TG_OP, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

-- Create trigger (drop existing first to be idempotent)
DROP TRIGGER IF EXISTS trg_transactions_insert_audit ON public.transactions;
CREATE TRIGGER trg_transactions_insert_audit
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.transactions_insert_audit_trigger();

-- 10) Sanity checks (informational selects you can run manually)
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name IN ('type','status','method');
-- SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transactions';
-- SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'transaction_method' ORDER BY enumsortorder;

-- ================================================================
-- End migration
-- ================================================================
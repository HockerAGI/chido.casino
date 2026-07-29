-- Chido Casino payment/admin/grants hardening.
-- Idempotent and safe to run after reviewing current grants/policies.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.deposit_intents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'deposit_intents_provider_allowed'
         AND conrelid = 'public.deposit_intents'::regclass
     ) THEN
    ALTER TABLE public.deposit_intents
      ADD CONSTRAINT deposit_intents_provider_allowed
      CHECK (provider IS NULL OR provider IN ('mercadopago', 'stripe')) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.deposit_intents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.deposit_intents
       WHERE provider IS NOT NULL
         AND provider NOT IN ('mercadopago', 'stripe')
     ) THEN
    ALTER TABLE public.deposit_intents VALIDATE CONSTRAINT deposit_intents_provider_allowed;
  END IF;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'balances',
    'transactions',
    'deposit_intents',
    'manual_deposit_requests',
    'withdraw_requests',
    'kyc_requests',
    'transactions_audit',
    'hocker_portal_grants',
    'project_members'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM authenticated',
        tbl
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.balances') IS NOT NULL THEN
    REVOKE UPDATE ON TABLE public.balances FROM authenticated;
    GRANT SELECT ON TABLE public.balances TO authenticated;
    DROP POLICY IF EXISTS balances_update_own ON public.balances;
    DROP POLICY IF EXISTS balances_select_own ON public.balances;
    CREATE POLICY balances_select_own ON public.balances
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.transactions TO authenticated;
    DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
    CREATE POLICY transactions_select_own ON public.transactions
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.profiles FROM anon;
    GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
    DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
    DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
    CREATE POLICY profiles_select_owner ON public.profiles
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
    CREATE POLICY profiles_update_owner ON public.profiles
      FOR UPDATE TO authenticated
      USING ((SELECT auth.uid()) = user_id)
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      IF auth.role() = 'authenticated' AND auth.uid() = NEW.user_id THEN
        NEW.role := OLD.role;
        NEW.kyc_status := OLD.kyc_status;
      END IF;
      RETURN NEW;
    END
    $fn$;

    DROP TRIGGER IF EXISTS profiles_prevent_self_escalation ON public.profiles;
    CREATE TRIGGER profiles_prevent_self_escalation
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_profile_self_escalation();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.project_members') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.project_members TO authenticated;
    DROP POLICY IF EXISTS project_members_select_own ON public.project_members;
    CREATE POLICY project_members_select_own ON public.project_members
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF to_regclass('public.hocker_portal_grants') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.hocker_portal_grants TO authenticated;
    DROP POLICY IF EXISTS hocker_portal_grants_select_own ON public.hocker_portal_grants;
    CREATE POLICY hocker_portal_grants_select_own ON public.hocker_portal_grants
      FOR SELECT TO authenticated
      USING (lower(grantee_email) = lower((auth.jwt() ->> 'email')));
  END IF;
END $$;

COMMIT;

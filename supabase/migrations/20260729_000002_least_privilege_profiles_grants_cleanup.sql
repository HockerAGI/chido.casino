-- Chido Casino least-privilege cleanup for authenticated grants.
-- Keeps client-owned reads and profile edits, while sensitive writes stay server-side.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.profiles FROM anon;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profiles FROM authenticated;
    GRANT SELECT ON TABLE public.profiles TO authenticated;
    GRANT UPDATE (username, avatar_url, updated_at) ON TABLE public.profiles TO authenticated;

    DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
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

  IF to_regclass('public.balances') IS NOT NULL THEN
    ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.balances FROM anon;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.balances FROM authenticated;
    GRANT SELECT ON TABLE public.balances TO authenticated;

    DROP POLICY IF EXISTS balances_update_own ON public.balances;
    DROP POLICY IF EXISTS balances_update_owner ON public.balances;
    DROP POLICY IF EXISTS balances_select_owner ON public.balances;
    DROP POLICY IF EXISTS balances_select_own ON public.balances;

    CREATE POLICY balances_select_own ON public.balances
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.transactions FROM anon;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.transactions FROM authenticated;
    GRANT SELECT ON TABLE public.transactions TO authenticated;

    DROP POLICY IF EXISTS block_delete_for_authenticated ON public.transactions;
    DROP POLICY IF EXISTS block_insert_for_authenticated ON public.transactions;
    DROP POLICY IF EXISTS block_update_for_authenticated ON public.transactions;
    DROP POLICY IF EXISTS transactions_select_owner ON public.transactions;
    DROP POLICY IF EXISTS transactions_select_own ON public.transactions;

    CREATE POLICY transactions_select_own ON public.transactions
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

COMMIT;

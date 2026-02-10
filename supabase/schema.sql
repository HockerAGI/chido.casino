-- ============================================================
-- CHIDO CASINO — HARDENING PATCH (SUPABASE LINTS)
-- ✅ RLS transactions_audit
-- ✅ auth_rls_initplan policy optimization
-- ✅ unindexed foreign_keys indexes (condicional)
-- ✅ search_path hardening en SECURITY DEFINER (auto)
-- ============================================================

-- 1) RLS: transactions_audit
DO $$
BEGIN
  IF to_regclass('public.transactions_audit') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.transactions_audit ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS transactions_audit_service_all ON public.transactions_audit';
    EXECUTE 'CREATE POLICY transactions_audit_service_all ON public.transactions_audit
             FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 2) Optimizar policies (auth_rls_initplan)
-- balances
DO $$
BEGIN
  IF to_regclass('public.balances') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS balances_select_own ON public.balances';
    EXECUTE 'CREATE POLICY balances_select_own ON public.balances
             FOR SELECT TO authenticated USING ((select auth.uid()) = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS balances_update_own ON public.balances';
    EXECUTE 'CREATE POLICY balances_update_own ON public.balances
             FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id)
             WITH CHECK ((select auth.uid()) = user_id)';
  END IF;
END $$;

-- profiles
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS profiles_select_owner ON public.profiles';
    EXECUTE 'CREATE POLICY profiles_select_owner ON public.profiles
             FOR SELECT TO authenticated USING ((select auth.uid()) = user_id)';

    EXECUTE 'DROP POLICY IF EXISTS profiles_update_owner ON public.profiles';
    EXECUTE 'CREATE POLICY profiles_update_owner ON public.profiles
             FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id)
             WITH CHECK ((select auth.uid()) = user_id)';
  END IF;
END $$;

-- transactions
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS transactions_select_own ON public.transactions';
    EXECUTE 'CREATE POLICY transactions_select_own ON public.transactions
             FOR SELECT TO authenticated USING ((select auth.uid()) = user_id)';
  END IF;
END $$;

-- 3) Indexes condicionales (unindexed_foreign_keys)
DO $$
BEGIN
  IF to_regclass('public.bets') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS bets_user_id_idx ON public.bets(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS bets_game_id_idx ON public.bets(game_id)';
  END IF;
END $$;

-- 4) search_path hardening automático para SECURITY DEFINER en public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname as schema,
           p.proname as fn,
           pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      r.schema, r.fn, r.args
    );
  END LOOP;
END $$;

-- ============================================================
-- FIN HARDENING PATCH
-- ============================================================
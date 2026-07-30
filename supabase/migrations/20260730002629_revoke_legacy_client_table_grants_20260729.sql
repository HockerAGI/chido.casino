do $$
declare
  target_table text;
begin
  for target_table in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and (
        table_name like 'agi_%'
        or table_name in (
          'affiliate_clicks',
          'affiliate_commissions',
          'affiliate_profiles',
          'affiliate_referrals',
          'affiliates',
          'promo_claims',
          'slot_spins',
          'supply_orders',
          'system_controls',
          'transactions',
          'withdraw_requests'
        )
      )
  loop
    execute format('revoke all privileges on table public.%I from anon', target_table);
    execute format('revoke all privileges on table public.%I from authenticated', target_table);
    execute format('alter table public.%I enable row level security', target_table);
  end loop;
end $$;

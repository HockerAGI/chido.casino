begin;

revoke select on public.slot_spins from authenticated;
revoke select on public.crash_bets from authenticated;

create or replace function public.get_my_slot_history(p_limit integer default 50)
returns table(
  id uuid,
  bet_amount numeric,
  multiplier numeric,
  payout_amount numeric,
  reels jsonb,
  round_ref text,
  server_seed_hash text,
  server_seed text,
  client_seed text,
  nonce bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.bet_amount,
    s.multiplier,
    s.payout_amount,
    s.reels,
    s.round_ref,
    s.server_seed_hash,
    s.server_seed,
    s.client_seed,
    s.nonce,
    s.created_at
  from public.slot_spins s
  where s.user_id = auth.uid()
  order by s.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke all on function public.get_my_slot_history(integer)
  from public, anon;
grant execute on function public.get_my_slot_history(integer)
  to authenticated, service_role;

comment on function public.get_my_slot_history(integer) is
  'Returns only the authenticated player own completed Taco Slot history.';

comment on function public.get_my_crash_history(integer) is
  'Returns only the authenticated player own completed Crash history.';

commit;
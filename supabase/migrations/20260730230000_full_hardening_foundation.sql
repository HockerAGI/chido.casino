-- Chido Casino full hardening foundation.
-- Mirrors the production migrations applied on 2026-07-30.

alter table public.profiles
  add column if not exists public_display_name text,
  add column if not exists leaderboard_opt_in boolean not null default false;

alter table public.free_round_entitlements
  add column if not exists ref_id text;

create unique index if not exists free_round_entitlements_ref_id_uidx
  on public.free_round_entitlements(ref_id)
  where ref_id is not null;

alter table public.daily_streak_claims
  add column if not exists free_rounds_awarded integer not null default 0,
  add column if not exists wagering_required numeric not null default 0,
  add column if not exists wagering_progress numeric not null default 0,
  add column if not exists reward_kind text not null default 'bonus';

create table if not exists public.wager_progress_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  wager_ref text not null,
  wager_amount numeric not null check (wager_amount > 0),
  game text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wager_progress_ledger_wager_ref_key unique (wager_ref)
);

create index if not exists wager_progress_ledger_user_created_idx
  on public.wager_progress_ledger(user_id, created_at desc);

alter table public.wager_progress_ledger enable row level security;
revoke all on table public.wager_progress_ledger from anon, authenticated;
grant all on table public.wager_progress_ledger to service_role;

insert into public.system_controls(
  id,
  project_id,
  kill_switch,
  allow_write,
  meta,
  updated_at
)
values (
  'chido-casino-games',
  'chido-casino',
  false,
  true,
  jsonb_build_object(
    'reason', 'Seeded by full financial hardening migration',
    'source', 'supabase-migration',
    'fail_closed', true
  ),
  now()
)
on conflict (project_id, id) do update
set meta = coalesce(public.system_controls.meta, '{}'::jsonb) || excluded.meta,
    updated_at = now();

create or replace function public.get_public_leaderboard(
  p_days integer default 7,
  p_limit integer default 25
)
returns table(
  rank bigint,
  display_name text,
  points numeric,
  profit numeric,
  wager numeric,
  plays bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with normalized as (
    select greatest(1, least(coalesce(p_days, 7), 30)) as days_count,
           greatest(1, least(coalesce(p_limit, 25), 100)) as row_limit
  ), activity as (
    select c.user_id,
           case when c.did_cashout then c.bet_amount * c.target_multiplier else 0 end::numeric as points,
           (c.payout - c.bet_amount)::numeric as profit,
           c.bet_amount::numeric as wager,
           1::bigint as plays
    from public.crash_bets c, normalized n
    where c.created_at >= now() - make_interval(days => n.days_count)
    union all
    select s.user_id,
           (s.bet_amount * s.multiplier)::numeric as points,
           (s.payout_amount - s.bet_amount)::numeric as profit,
           s.bet_amount::numeric as wager,
           1::bigint as plays
    from public.slot_spins s, normalized n
    where s.created_at >= now() - make_interval(days => n.days_count)
  ), totals as (
    select a.user_id,
           round(sum(a.points), 2) as points,
           round(sum(a.profit), 2) as profit,
           round(sum(a.wager), 2) as wager,
           sum(a.plays)::bigint as plays
    from activity a
    group by a.user_id
  ), visible as (
    select t.*, trim(p.public_display_name) as display_name
    from totals t
    join public.profiles p on p.user_id = t.user_id
    where p.leaderboard_opt_in = true
      and nullif(trim(p.public_display_name), '') is not null
  )
  select row_number() over(order by v.points desc, v.plays desc, v.display_name asc),
         v.display_name,
         v.points,
         v.profit,
         v.wager,
         v.plays
  from visible v, normalized n
  order by v.points desc, v.plays desc, v.display_name asc
  limit (select row_limit from normalized);
$$;

create or replace function public.get_public_recent_wins(p_limit integer default 20)
returns table(
  display_name text,
  game text,
  payout numeric,
  multiplier numeric,
  created_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  with wins as (
    select c.user_id,
           'crash'::text as game,
           c.payout::numeric as payout,
           c.target_multiplier::numeric as multiplier,
           c.created_at
    from public.crash_bets c
    where c.did_cashout = true and c.payout > 0
    union all
    select s.user_id,
           'taco_slot'::text as game,
           s.payout_amount::numeric as payout,
           s.multiplier::numeric as multiplier,
           s.created_at
    from public.slot_spins s
    where s.payout_amount > 0
  )
  select trim(p.public_display_name),
         w.game,
         round(w.payout, 2),
         round(w.multiplier, 2),
         w.created_at
  from wins w
  join public.profiles p on p.user_id = w.user_id
  where p.leaderboard_opt_in = true
    and nullif(trim(p.public_display_name), '') is not null
  order by w.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.get_public_leaderboard(integer, integer) from public;
revoke all on function public.get_public_recent_wins(integer) from public;
grant execute on function public.get_public_leaderboard(integer, integer) to anon, authenticated, service_role;
grant execute on function public.get_public_recent_wins(integer) to anon, authenticated, service_role;

-- Consolidate overlapping permissive policies without widening access.
drop policy if exists hocker_portal_grants_owner_service_only on public.hocker_portal_grants;
drop policy if exists hocker_portal_grants_select_own on public.hocker_portal_grants;
create policy hocker_portal_grants_select_own
  on public.hocker_portal_grants
  for select
  to authenticated
  using (lower(grantee_email) = lower(((select auth.jwt())->>'email')));

drop policy if exists project_members_admin_write on public.project_members;
drop policy if exists project_members_select_own on public.project_members;
drop policy if exists project_members_service_all on public.project_members;
create policy project_members_select_authorized
  on public.project_members for select to authenticated
  using ((select auth.uid()) = user_id or private.is_project_admin(project_id));
create policy project_members_insert_admin
  on public.project_members for insert to authenticated
  with check (private.is_project_admin(project_id));
create policy project_members_update_admin
  on public.project_members for update to authenticated
  using (private.is_project_admin(project_id))
  with check (private.is_project_admin(project_id));
create policy project_members_delete_admin
  on public.project_members for delete to authenticated
  using (private.is_project_admin(project_id));

drop policy if exists system_controls_admin_write on public.system_controls;
drop policy if exists system_controls_select_admin on public.system_controls;
create policy system_controls_select_admin
  on public.system_controls for select to authenticated
  using (private.is_project_admin(project_id));
create policy system_controls_insert_admin
  on public.system_controls for insert to authenticated
  with check (private.is_project_admin(project_id));
create policy system_controls_update_admin
  on public.system_controls for update to authenticated
  using (private.is_project_admin(project_id))
  with check (private.is_project_admin(project_id));
create policy system_controls_delete_admin
  on public.system_controls for delete to authenticated
  using (private.is_project_admin(project_id));

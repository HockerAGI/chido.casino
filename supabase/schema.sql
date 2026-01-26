-- =========================================================
-- CHIDO CASINO (HOCKER WALLET MODEL) - SUPABASE SCHEMA
-- Idempotente: crea/ajusta tablas sin romper estructura.
-- Incluye:
--  - profiles (cashback_rate + referral)
--  - balances (snapshot)
--  - transactions (ledger)
--  - deposit_intents (AstroPay)
--  - withdraw_requests
--  - promos
--  - crash_rounds + crash_bets (provably fair)
--  - RPC wallet_apply_delta (atómica)
-- =========================================================

create extension if not exists "pgcrypto";

-- -------------------------
-- ENUMS
-- -------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'kyc_status') then
    create type kyc_status as enum ('unverified','pending','approved','rejected');
  end if;
end $$;

-- -------------------------
-- PROFILES
-- -------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  gender text,
  avatar_url text,
  is_verified boolean default false,
  kyc_status kyc_status default 'unverified',

  cashback_rate numeric(5,4) not null default 0.0100,
  last_deposit_amount numeric(12,2),
  last_deposit_at timestamptz,

  referral_code text unique,
  referred_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_referred_by_idx on public.profiles(referred_by);

-- -------------------------
-- BALANCES (snapshot rápido)
-- -------------------------
create table if not exists public.balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 0,
  bonus_balance numeric(12,2) not null default 0,
  locked_balance numeric(12,2) not null default 0,
  currency text not null default 'MXN',
  updated_at timestamptz not null default now()
);

-- -------------------------
-- TRANSACTIONS (ledger)
-- -------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  delta_balance numeric(12,2) not null default 0,
  delta_bonus numeric(12,2) not null default 0,
  delta_locked numeric(12,2) not null default 0,
  ref_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_idx on public.transactions(user_id);
create index if not exists transactions_reason_idx on public.transactions(reason);

-- -------------------------
-- RPC: wallet_apply_delta (ATÓMICA)
-- -------------------------
create or replace function public.wallet_apply_delta(
  p_user_id uuid,
  p_delta_balance numeric default 0,
  p_delta_bonus numeric default 0,
  p_delta_locked numeric default 0,
  p_reason text default 'unknown',
  p_ref_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  user_id uuid,
  balance numeric,
  bonus_balance numeric,
  locked_balance numeric,
  currency text
)
language plpgsql
security definer
as $$
declare
  v_balance numeric;
  v_bonus numeric;
  v_locked numeric;
begin
  insert into public.balances(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select balance, bonus_balance, locked_balance
    into v_balance, v_bonus, v_locked
  from public.balances
  where user_id = p_user_id
  for update;

  v_balance := v_balance + coalesce(p_delta_balance,0);
  v_bonus   := v_bonus + coalesce(p_delta_bonus,0);
  v_locked  := v_locked + coalesce(p_delta_locked,0);

  if v_balance < 0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
  if v_bonus < 0 then raise exception 'INSUFFICIENT_BONUS'; end if;
  if v_locked < 0 then raise exception 'INSUFFICIENT_LOCKED'; end if;

  update public.balances
     set balance = round(v_balance,2),
         bonus_balance = round(v_bonus,2),
         locked_balance = round(v_locked,2),
         updated_at = now()
   where user_id = p_user_id;

  insert into public.transactions(user_id, reason, delta_balance, delta_bonus, delta_locked, ref_id, metadata)
  values (
    p_user_id,
    coalesce(p_reason,'unknown'),
    round(coalesce(p_delta_balance,0),2),
    round(coalesce(p_delta_bonus,0),2),
    round(coalesce(p_delta_locked,0),2),
    p_ref_id,
    coalesce(p_metadata,'{}'::jsonb)
  );

  return query
  select b.user_id, b.balance, b.bonus_balance, b.locked_balance, b.currency
    from public.balances b
   where b.user_id = p_user_id;
end;
$$;

revoke all on function public.wallet_apply_delta(uuid,numeric,numeric,numeric,text,text,jsonb) from public;
grant execute on function public.wallet_apply_delta(uuid,numeric,numeric,numeric,text,text,jsonb) to authenticated, service_role;

-- -------------------------
-- DEPOSIT INTENTS (AstroPay)
-- -------------------------
create table if not exists public.deposit_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'astropay',
  method text not null,
  amount numeric(12,2) not null,
  currency text not null default 'MXN',
  status text not null default 'pending',
  external_id text not null unique,
  provider_reference text,
  provider_payload jsonb,
  instructions jsonb,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deposit_intents_user_idx on public.deposit_intents(user_id);

-- -------------------------
-- WITHDRAW REQUESTS
-- -------------------------
create table if not exists public.withdraw_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'MXN',
  status text not null default 'pending',
  external_id text not null unique,
  provider text default 'astropay',
  provider_payload jsonb,

  clabe text not null,
  beneficiary text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists withdraw_requests_user_idx on public.withdraw_requests(user_id);

-- -------------------------
-- PROMOS
-- -------------------------
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  reward_balance numeric(12,2) not null default 0,
  reward_bonus numeric(12,2) not null default 0,
  is_active boolean not null default true,
  max_redemptions int,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(promo_id, user_id)
);

create index if not exists promo_redemptions_user_idx on public.promo_redemptions(user_id);

insert into public.promo_codes(code, title, description, reward_balance, reward_bonus, is_active)
values ('CHIDO1', 'Bono de Arranque', 'Activa tu cuenta y recibe un bono inicial.', 0, 50, true)
on conflict (code) do nothing;

-- -------------------------
-- CRASH (Provably Fair) - estructura base
-- -------------------------
create table if not exists public.crash_rounds (
  id uuid primary key default gen_random_uuid(),
  nonce bigint not null unique,
  server_seed text not null,
  server_seed_hash text not null,
  client_seed text not null,
  bust_multiplier numeric(10,2) not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz not null,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crash_bets (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.crash_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bet_amount numeric(12,2) not null,
  auto_cashout numeric(10,2),
  status text not null default 'active',
  cashout_multiplier numeric(10,2),
  payout_amount numeric(12,2) not null default 0,
  cashback_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crash_bets_user_idx on public.crash_bets(user_id);
create index if not exists crash_bets_round_idx on public.crash_bets(round_id);

-- -------------------------
-- TRIGGER: crear profile + balance al registrarse
-- -------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
as $$
declare
  v_code text;
begin
  v_code := substring(replace(gen_random_uuid()::text,'-','') from 1 for 10);

  insert into public.profiles(user_id, referral_code)
  values (new.id, v_code)
  on conflict (user_id) do nothing;

  insert into public.balances(user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- -------------------------
-- RLS
-- -------------------------
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.transactions enable row level security;
alter table public.deposit_intents enable row level security;
alter table public.withdraw_requests enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.crash_rounds enable row level security;
alter table public.crash_bets enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- balances
drop policy if exists "balances_select_own" on public.balances;
create policy "balances_select_own" on public.balances
for select to authenticated
using (auth.uid() = user_id);

-- transactions
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
for select to authenticated
using (auth.uid() = user_id);

-- deposit_intents
drop policy if exists "deposit_intents_select_own" on public.deposit_intents;
create policy "deposit_intents_select_own" on public.deposit_intents
for select to authenticated
using (auth.uid() = user_id);

-- withdraw_requests
drop policy if exists "withdraw_requests_select_own" on public.withdraw_requests;
create policy "withdraw_requests_select_own" on public.withdraw_requests
for select to authenticated
using (auth.uid() = user_id);

-- promo_codes
drop policy if exists "promo_codes_read" on public.promo_codes;
create policy "promo_codes_read" on public.promo_codes
for select to authenticated
using (true);

-- promo_redemptions
drop policy if exists "promo_redemptions_select_own" on public.promo_redemptions;
create policy "promo_redemptions_select_own" on public.promo_redemptions
for select to authenticated
using (auth.uid() = user_id);

-- crash_rounds
drop policy if exists "crash_rounds_read" on public.crash_rounds;
create policy "crash_rounds_read" on public.crash_rounds
for select to authenticated
using (true);

-- crash_bets
drop policy if exists "crash_bets_select_own" on public.crash_bets;
create policy "crash_bets_select_own" on public.crash_bets
for select to authenticated
using (auth.uid() = user_id);
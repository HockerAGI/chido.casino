-- Applied to production on 2026-07-30.
-- Makes wallet idempotency, streak claims, Taco Slot and Crash settlement atomic.

create or replace function public.wallet_apply_delta(
  p_user_id uuid,
  p_delta_balance numeric,
  p_delta_bonus numeric default 0,
  p_delta_locked numeric default 0,
  p_reason text default 'wallet_delta',
  p_ref_id text default null,
  p_method text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_balance numeric := 0;
  v_bonus numeric := 0;
  v_locked numeric := 0;
  v_currency text := 'MXN';
  v_new_balance numeric := 0;
  v_new_bonus numeric := 0;
  v_new_locked numeric := 0;
  v_tx_id uuid;
  v_type transaction_type;
  v_method transaction_method;
  v_existing_tx uuid;
  v_amount numeric;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;

  if p_ref_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_ref_id, 0));
    select t.id into v_existing_tx
    from public.transactions t
    where t.ref_id = p_ref_id
    limit 1;

    if found then
      select b.balance, b.bonus_balance, b.locked_balance, b.currency
      into v_balance, v_bonus, v_locked, v_currency
      from public.balances b
      where b.user_id = p_user_id;

      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'tx_id', v_existing_tx,
        'balance', coalesce(v_balance, 0),
        'bonus_balance', coalesce(v_bonus, 0),
        'locked_balance', coalesce(v_locked, 0),
        'currency', coalesce(v_currency, 'MXN')
      );
    end if;
  end if;

  insert into public.balances(
    user_id, balance, bonus_balance, locked_balance, commission_balance, currency
  ) values (p_user_id, 0, 0, 0, 0, 'MXN')
  on conflict (user_id) do nothing;

  select b.balance, b.bonus_balance, b.locked_balance, b.currency
  into v_balance, v_bonus, v_locked, v_currency
  from public.balances b
  where b.user_id = p_user_id
  for update;

  v_balance := coalesce(v_balance, 0);
  v_bonus := coalesce(v_bonus, 0);
  v_locked := coalesce(v_locked, 0);
  v_currency := coalesce(v_currency, 'MXN');
  v_new_balance := v_balance + coalesce(p_delta_balance, 0);
  v_new_bonus := v_bonus + coalesce(p_delta_bonus, 0);
  v_new_locked := v_locked + coalesce(p_delta_locked, 0);

  if v_new_balance < 0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
  if v_new_bonus < 0 then raise exception 'INSUFFICIENT_BONUS'; end if;
  if v_new_locked < 0 then raise exception 'INSUFFICIENT_LOCKED'; end if;

  v_type := case
    when lower(coalesce(p_reason, '')) like '%deposit%' then 'deposit'::transaction_type
    when lower(coalesce(p_reason, '')) like '%withdraw%' then 'withdraw'::transaction_type
    when lower(coalesce(p_reason, '')) like '%bet%' then 'bet'::transaction_type
    when lower(coalesce(p_reason, '')) like '%bust%' then 'bet'::transaction_type
    when lower(coalesce(p_reason, '')) like '%win%' then 'win'::transaction_type
    when lower(coalesce(p_reason, '')) like '%payout%' then 'win'::transaction_type
    when lower(coalesce(p_reason, '')) like '%cashout%' then 'win'::transaction_type
    when lower(coalesce(p_reason, '')) like '%cashback%' then 'bonus'::transaction_type
    when lower(coalesce(p_reason, '')) like '%promo%' then 'bonus'::transaction_type
    when lower(coalesce(p_reason, '')) like '%streak%' then 'bonus'::transaction_type
    when lower(coalesce(p_reason, '')) like '%free_round%' then 'bonus'::transaction_type
    when lower(coalesce(p_reason, '')) like '%bonus%' then 'bonus'::transaction_type
    when lower(coalesce(p_reason, '')) like '%release%' then 'bonus'::transaction_type
    else 'adjustment'::transaction_type
  end;

  begin
    v_method := public.pick_transaction_method(coalesce(p_method, 'manual'));
  exception when others then
    v_method := 'manual'::transaction_method;
  end;

  update public.balances
  set balance = round(v_new_balance, 2),
      bonus_balance = round(v_new_bonus, 2),
      locked_balance = round(v_new_locked, 2),
      updated_at = now()
  where user_id = p_user_id;

  update public.profiles
  set balance = round(v_new_balance, 2), updated_at = now()
  where id = p_user_id;

  v_tx_id := gen_random_uuid();
  v_amount := round(coalesce(
    nullif(p_delta_balance, 0),
    nullif(p_delta_bonus, 0),
    nullif(p_delta_locked, 0),
    0
  ), 2);

  insert into public.transactions(
    id, user_id, amount, type, status, method, reason, ref_id, metadata,
    created_at, updated_at
  ) values (
    v_tx_id, p_user_id, v_amount, v_type, 'completed'::transaction_status,
    v_method, p_reason, p_ref_id, coalesce(p_metadata, '{}'::jsonb), now(), now()
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'tx_id', v_tx_id,
    'balance', round(v_new_balance, 2),
    'bonus_balance', round(v_new_bonus, 2),
    'locked_balance', round(v_new_locked, 2),
    'currency', v_currency
  );
end;
$function$;

revoke all on function public.wallet_apply_delta(uuid,numeric,numeric,numeric,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.wallet_apply_delta(uuid,numeric,numeric,numeric,text,text,text,jsonb) to service_role;

create table if not exists public.daily_streak_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null,
  streak_count integer not null check (streak_count > 0),
  reward_amount numeric(12,2) not null check (reward_amount >= 0),
  claimed_at timestamptz not null default now(),
  wallet_ref_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, claim_date),
  unique (wallet_ref_id)
);

alter table public.daily_streak_claims enable row level security;
drop policy if exists daily_streak_claims_service_all on public.daily_streak_claims;
create policy daily_streak_claims_service_all on public.daily_streak_claims
  for all to service_role using (true) with check (true);
revoke all on table public.daily_streak_claims from public, anon, authenticated;
grant all on table public.daily_streak_claims to service_role;

create or replace function public.claim_daily_streak(
  p_user_id uuid,
  p_claimed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_claim_date date := timezone('utc', p_claimed_at)::date;
  v_existing public.daily_streak_claims%rowtype;
  v_last_date date;
  v_last_streak integer := 0;
  v_streak integer := 1;
  v_rewards numeric[] := array[100,200,300,400,500,600,1000]::numeric[];
  v_reward numeric;
  v_ref text;
  v_wallet jsonb;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('daily_streak:' || p_user_id::text || ':' || v_claim_date::text, 0)
  );

  select * into v_existing
  from public.daily_streak_claims
  where user_id = p_user_id and claim_date = v_claim_date
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'already_claimed', true,
      'awarded', v_existing.reward_amount,
      'streak', v_existing.streak_count,
      'claimed_at', v_existing.claimed_at
    );
  end if;

  select claim_date, streak_count into v_last_date, v_last_streak
  from public.daily_streak_claims
  where user_id = p_user_id and claim_date < v_claim_date
  order by claim_date desc
  limit 1
  for update;

  if v_last_date = v_claim_date - 1 then
    v_streak := coalesce(v_last_streak, 0) + 1;
  end if;

  v_reward := v_rewards[least(v_streak, array_length(v_rewards, 1))];
  v_ref := 'daily_streak:' || p_user_id::text || ':' || v_claim_date::text;

  v_wallet := public.wallet_apply_delta(
    p_user_id => p_user_id,
    p_delta_balance => 0,
    p_delta_bonus => v_reward,
    p_delta_locked => 0,
    p_reason => 'daily_streak_claim',
    p_ref_id => v_ref,
    p_method => 'manual',
    p_metadata => jsonb_build_object(
      'day', v_streak,
      'reward', v_reward,
      'claim_date', v_claim_date
    )
  );

  insert into public.daily_streak_claims(
    user_id, claim_date, streak_count, reward_amount, claimed_at, wallet_ref_id
  ) values (
    p_user_id, v_claim_date, v_streak, v_reward, p_claimed_at, v_ref
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', coalesce((v_wallet->>'idempotent')::boolean, false),
    'already_claimed', false,
    'awarded', v_reward,
    'streak', v_streak,
    'claimed_at', p_claimed_at,
    'wallet', v_wallet
  );
end;
$function$;

revoke all on function public.claim_daily_streak(uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.claim_daily_streak(uuid,timestamptz) to service_role;

alter table public.slot_spins add column if not exists round_ref text;
create unique index if not exists slot_spins_round_ref_uidx
  on public.slot_spins(round_ref) where round_ref is not null;
create unique index if not exists slot_spins_nonce_uidx
  on public.slot_spins(nonce) where nonce is not null;
create unique index if not exists crash_bets_ref_id_uidx
  on public.crash_bets(ref_id) where ref_id is not null;

do $block$
begin
  if to_regclass('public.slot_spins_nonce_seq') is null then
    execute 'create sequence public.slot_spins_nonce_seq as bigint';
    perform setval(
      'public.slot_spins_nonce_seq',
      greatest(coalesce((select max(nonce) from public.slot_spins), 0) + 1, 1),
      false
    );
  end if;
end;
$block$;

alter sequence public.slot_spins_nonce_seq owned by public.slot_spins.nonce;
alter table public.slot_spins
  alter column nonce set default nextval('public.slot_spins_nonce_seq');

create or replace function public.next_slot_nonce()
returns bigint
language sql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select nextval('public.slot_spins_nonce_seq');
$function$;
revoke all on function public.next_slot_nonce() from public, anon, authenticated;
grant execute on function public.next_slot_nonce() to service_role;

create or replace function public.casino_settle_taco_slot(
  p_user_id uuid,
  p_round_ref text,
  p_bet_amount numeric,
  p_payout_amount numeric,
  p_multiplier numeric,
  p_reels jsonb,
  p_server_seed_hash text,
  p_server_seed text,
  p_client_seed text,
  p_nonce bigint,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_existing public.slot_spins%rowtype;
  v_balance numeric;
  v_bonus numeric;
  v_source text;
  v_bet jsonb;
  v_payout jsonb;
  v_spin_id uuid;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if nullif(trim(p_round_ref), '') is null then raise exception 'ROUND_REF_REQUIRED'; end if;
  if coalesce(p_bet_amount, 0) <= 0 then raise exception 'INVALID_BET'; end if;
  if coalesce(p_payout_amount, 0) < 0 then raise exception 'INVALID_PAYOUT'; end if;
  if coalesce(p_nonce, 0) <= 0 then raise exception 'INVALID_NONCE'; end if;

  perform pg_advisory_xact_lock(hashtextextended('taco_slot:' || p_round_ref, 0));
  select * into v_existing
  from public.slot_spins
  where round_ref = p_round_ref
  limit 1;

  if found then
    if v_existing.user_id <> p_user_id then raise exception 'ROUND_REF_CONFLICT'; end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'spin_id', v_existing.id,
      'nonce', v_existing.nonce,
      'payout', v_existing.payout_amount
    );
  end if;

  insert into public.balances(
    user_id,balance,bonus_balance,locked_balance,commission_balance,currency
  ) values (p_user_id,0,0,0,0,'MXN')
  on conflict (user_id) do nothing;

  select balance, bonus_balance into v_balance, v_bonus
  from public.balances
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) >= p_bet_amount then
    v_source := 'balance';
    v_bet := public.wallet_apply_delta(
      p_user_id, -p_bet_amount, 0, 0, 'taco_slot_bet_balance',
      p_round_ref || ':bet', 'manual',
      jsonb_build_object('game','taco_slot','source','balance')
    );
  elsif coalesce(v_bonus, 0) >= p_bet_amount then
    v_source := 'bonus';
    v_bet := public.wallet_apply_delta(
      p_user_id, 0, -p_bet_amount, 0, 'taco_slot_bet_bonus',
      p_round_ref || ':bet', 'manual',
      jsonb_build_object('game','taco_slot','source','bonus')
    );
  else
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  if p_payout_amount > 0 then
    v_payout := public.wallet_apply_delta(
      p_user_id, p_payout_amount, 0, 0, 'taco_slot_win',
      p_round_ref || ':payout', 'manual',
      jsonb_build_object('game','taco_slot','multiplier',p_multiplier)
    );
  end if;

  insert into public.slot_spins(
    user_id, bet_amount, payout_amount, multiplier, reels,
    server_seed_hash, server_seed, client_seed, nonce, metadata, round_ref
  ) values (
    p_user_id, round(p_bet_amount,2), round(p_payout_amount,2), p_multiplier,
    p_reels, p_server_seed_hash, p_server_seed, p_client_seed, p_nonce,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('wallet_source',v_source),
    p_round_ref
  ) returning id into v_spin_id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'spin_id', v_spin_id,
    'nonce', p_nonce,
    'source', v_source,
    'bet_wallet', v_bet,
    'payout_wallet', v_payout
  );
end;
$function$;

revoke all on function public.casino_settle_taco_slot(uuid,text,numeric,numeric,numeric,jsonb,text,text,text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.casino_settle_taco_slot(uuid,text,numeric,numeric,numeric,jsonb,text,text,text,bigint,jsonb) to service_role;

create or replace function public.casino_settle_crash(
  p_user_id uuid,
  p_round_ref text,
  p_bet_amount numeric,
  p_target_multiplier numeric,
  p_crash_multiplier numeric,
  p_did_cashout boolean,
  p_payout_amount numeric,
  p_server_seed_hash text,
  p_server_seed text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_existing public.crash_bets%rowtype;
  v_balance numeric;
  v_bonus numeric;
  v_source text;
  v_bet jsonb;
  v_settle jsonb;
  v_bet_id uuid;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if nullif(trim(p_round_ref), '') is null then raise exception 'ROUND_REF_REQUIRED'; end if;
  if coalesce(p_bet_amount, 0) <= 0 then raise exception 'INVALID_BET'; end if;
  if coalesce(p_payout_amount, 0) < 0 then raise exception 'INVALID_PAYOUT'; end if;
  if not coalesce(p_did_cashout, false) and coalesce(p_payout_amount, 0) <> 0 then
    raise exception 'INVALID_BUST_PAYOUT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('crash:' || p_round_ref, 0));
  select * into v_existing
  from public.crash_bets
  where ref_id = p_round_ref
  limit 1;

  if found then
    if v_existing.user_id <> p_user_id then raise exception 'ROUND_REF_CONFLICT'; end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'bet_id', v_existing.id,
      'payout', v_existing.payout,
      'did_cashout', v_existing.did_cashout
    );
  end if;

  insert into public.balances(
    user_id,balance,bonus_balance,locked_balance,commission_balance,currency
  ) values (p_user_id,0,0,0,0,'MXN')
  on conflict (user_id) do nothing;

  select balance, bonus_balance into v_balance, v_bonus
  from public.balances
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) >= p_bet_amount then
    v_source := 'balance';
    v_bet := public.wallet_apply_delta(
      p_user_id, -p_bet_amount, 0, p_bet_amount, 'crash_bet_balance',
      p_round_ref || ':bet', 'manual',
      jsonb_build_object('game','crash','source','balance')
    );
  elsif coalesce(v_bonus, 0) >= p_bet_amount then
    v_source := 'bonus';
    v_bet := public.wallet_apply_delta(
      p_user_id, 0, -p_bet_amount, p_bet_amount, 'crash_bet_bonus',
      p_round_ref || ':bet', 'manual',
      jsonb_build_object('game','crash','source','bonus')
    );
  else
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  insert into public.crash_bets(
    user_id, bet_amount, target_multiplier, crash_multiplier,
    did_cashout, payout, ref_id, server_seed_hash, server_seed, metadata
  ) values (
    p_user_id, round(p_bet_amount,2), p_target_multiplier, p_crash_multiplier,
    p_did_cashout, round(p_payout_amount,2), p_round_ref,
    p_server_seed_hash, p_server_seed,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('wallet_source',v_source)
  ) returning id into v_bet_id;

  v_settle := public.wallet_apply_delta(
    p_user_id, p_payout_amount, 0, -p_bet_amount,
    case when p_did_cashout then 'crash_cashout' else 'crash_bust' end,
    p_round_ref || ':settle', 'manual',
    jsonb_build_object(
      'game','crash',
      'did_cashout',p_did_cashout,
      'target_multiplier',p_target_multiplier
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'bet_id', v_bet_id,
    'source', v_source,
    'bet_wallet', v_bet,
    'settle_wallet', v_settle
  );
end;
$function$;

revoke all on function public.casino_settle_crash(uuid,text,numeric,numeric,numeric,boolean,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.casino_settle_crash(uuid,text,numeric,numeric,numeric,boolean,numeric,text,text,jsonb) to service_role;

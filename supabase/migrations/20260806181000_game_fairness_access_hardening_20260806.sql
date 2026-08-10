begin;

create or replace function private.chido_fair_float(
  p_server_seed text,
  p_client_seed text,
  p_nonce bigint,
  p_round integer
)
returns numeric
language plpgsql
immutable
strict
set search_path = extensions, pg_temp
as $$
declare
  v_hex text;
  v_int bigint;
begin
  v_hex := encode(
    hmac(
      convert_to(p_client_seed || ':' || p_nonce::text || ':' || p_round::text, 'UTF8'),
      convert_to(p_server_seed, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_int := ('x' || substr(v_hex, 1, 13))::bit(52)::bigint;
  return v_int::numeric / 4503599627370496::numeric;
end;
$$;

create or replace function private.validate_slot_spin_fairness()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_expected text[] := array[]::text[];
  v_random numeric;
  v_key text;
  v_multiplier numeric;
  i integer;
  a text;
  b text;
  c text;
begin
  if new.server_seed_hash is distinct from encode(digest(new.server_seed, 'sha256'), 'hex') then
    raise exception 'SERVER_SEED_HASH_MISMATCH';
  end if;
  if jsonb_typeof(new.reels) <> 'array' or jsonb_array_length(new.reels) <> 3 then
    raise exception 'INVALID_REELS';
  end if;

  for i in 0..2 loop
    v_random := private.chido_fair_float(new.server_seed, new.client_seed, new.nonce, i);
    v_key := case
      when v_random <= 0.42 then 'verde'
      when v_random <= 0.72 then 'jalapeno'
      when v_random <= 0.92 then 'serrano'
      else 'habanero'
    end;
    v_expected := array_append(v_expected, v_key);
    if coalesce(new.reels -> i ->> 'key', '') <> v_key then
      raise exception 'REELS_FAIRNESS_MISMATCH';
    end if;
  end loop;

  a := v_expected[1];
  b := v_expected[2];
  c := v_expected[3];
  v_multiplier := case
    when a = b and b = c then
      case a
        when 'habanero' then 20
        when 'serrano' then 10
        when 'jalapeno' then 5
        else 3
      end
    when a = b or b = c or a = c then 0.82
    else 0
  end;

  if abs(new.multiplier - v_multiplier) > 0.000001 then
    raise exception 'MULTIPLIER_REELS_MISMATCH';
  end if;
  if abs(round(new.bet_amount * new.multiplier, 2) - round(new.payout_amount, 2)) > 0.01 then
    raise exception 'PAYOUT_MULTIPLIER_MISMATCH';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_slot_spin_fairness on public.slot_spins;
create trigger trg_validate_slot_spin_fairness
before insert or update of
  reels,
  server_seed_hash,
  server_seed,
  client_seed,
  nonce,
  multiplier,
  bet_amount,
  payout_amount
on public.slot_spins
for each row execute function private.validate_slot_spin_fairness();

create or replace function private.validate_crash_bet_fairness()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_edge_bps numeric;
  v_house_factor numeric;
  v_random numeric;
  v_expected numeric;
begin
  if new.server_seed_hash is distinct from encode(digest(new.server_seed, 'sha256'), 'hex') then
    raise exception 'SERVER_SEED_HASH_MISMATCH';
  end if;

  v_edge_bps := coalesce((new.metadata ->> 'house_edge_bps')::numeric, 200);
  if v_edge_bps < 0 or v_edge_bps > 5000 then
    raise exception 'HOUSE_EDGE_INVALID';
  end if;

  v_house_factor := 1 - v_edge_bps / 10000;
  v_random := private.chido_fair_float(new.server_seed, 'client:' || new.ref_id, 0, 0);
  v_expected := floor((v_house_factor / (1 - v_random)) * 100) / 100;
  if v_expected < 1 then v_expected := 1; end if;
  if v_expected > 1000000 then v_expected := 1000000; end if;

  if abs(new.crash_multiplier - v_expected) > 0.000001 then
    raise exception 'CRASH_FAIRNESS_MISMATCH';
  end if;

  if new.did_cashout then
    if new.target_multiplier > new.crash_multiplier
       or abs(round(new.bet_amount * new.target_multiplier, 2) - round(new.payout, 2)) > 0.01 then
      raise exception 'CRASH_RESULT_MISMATCH';
    end if;
  else
    if new.target_multiplier <= new.crash_multiplier
       or round(new.payout, 2) <> 0 then
      raise exception 'CRASH_RESULT_MISMATCH';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_crash_bet_fairness on public.crash_bets;
create trigger trg_validate_crash_bet_fairness
before insert or update of
  ref_id,
  server_seed_hash,
  server_seed,
  metadata,
  crash_multiplier,
  target_multiplier,
  did_cashout,
  bet_amount,
  payout
on public.crash_bets
for each row execute function private.validate_crash_bet_fairness();

alter table public.slot_spins
  drop constraint if exists slot_spins_seed_hash_matches;
alter table public.slot_spins
  add constraint slot_spins_seed_hash_matches
  check (server_seed_hash = encode(digest(server_seed, 'sha256'), 'hex')) not valid;
alter table public.slot_spins validate constraint slot_spins_seed_hash_matches;

alter table public.crash_bets
  drop constraint if exists crash_bets_seed_hash_matches;
alter table public.crash_bets
  add constraint crash_bets_seed_hash_matches
  check (server_seed_hash = encode(digest(server_seed, 'sha256'), 'hex')) not valid;
alter table public.crash_bets validate constraint crash_bets_seed_hash_matches;

revoke select on public.crash_bets from authenticated;

create or replace function public.get_my_crash_history(p_limit integer default 50)
returns table(
  id uuid,
  bet_amount numeric,
  target_multiplier numeric,
  crash_multiplier numeric,
  did_cashout boolean,
  payout numeric,
  ref_id text,
  server_seed_hash text,
  server_seed text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.bet_amount,
    c.target_multiplier,
    c.crash_multiplier,
    c.did_cashout,
    c.payout,
    c.ref_id,
    c.server_seed_hash,
    c.server_seed,
    c.created_at
  from public.crash_bets c
  where c.user_id = auth.uid()
  order by c.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke all on function public.get_my_crash_history(integer)
  from public, anon;
grant execute on function public.get_my_crash_history(integer)
  to authenticated, service_role;

commit;
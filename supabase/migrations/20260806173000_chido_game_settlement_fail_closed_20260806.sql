begin;

create or replace function private.assert_chido_game_write_allowed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_allow_write boolean;
  v_kill_switch boolean;
  v_self_excluded_until timestamptz;
  v_kyc_status text;
begin
  if p_user_id is null then
    raise exception 'USER_REQUIRED';
  end if;

  select allow_write, kill_switch
    into v_allow_write, v_kill_switch
  from public.system_controls
  where id = 'chido-casino-games';

  if not found then
    raise exception 'GAME_CONTROL_MISSING';
  end if;

  if coalesce(v_kill_switch, true) or not coalesce(v_allow_write, false) then
    raise exception 'GAMES_PAUSED';
  end if;

  select self_excluded_until, lower(coalesce(kyc_status, ''))
    into v_self_excluded_until, v_kyc_status
  from public.profiles
  where user_id = p_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_kyc_status <> 'approved' then
    raise exception 'KYC_REQUIRED';
  end if;

  if v_self_excluded_until is not null and v_self_excluded_until > now() then
    raise exception 'SELF_EXCLUDED';
  end if;
end;
$$;

revoke all on function private.assert_chido_game_write_allowed(uuid)
  from public, anon, authenticated;
grant execute on function private.assert_chido_game_write_allowed(uuid)
  to service_role;

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
set search_path = public, pg_temp
as $$
declare
  v_existing public.slot_spins%rowtype;
  v_balance numeric;
  v_bonus numeric;
  v_source text;
  v_bet jsonb;
  v_payout jsonb;
  v_effects jsonb;
  v_spin_id uuid;
  v_expected_payout numeric;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if nullif(trim(p_round_ref), '') is null then raise exception 'ROUND_REF_REQUIRED'; end if;
  if coalesce(p_bet_amount, 0) <= 0 then raise exception 'INVALID_BET'; end if;
  if coalesce(p_payout_amount, 0) < 0 then raise exception 'INVALID_PAYOUT'; end if;
  if coalesce(p_multiplier, 0) < 0 then raise exception 'INVALID_MULTIPLIER'; end if;
  if coalesce(p_nonce, 0) <= 0 then raise exception 'INVALID_NONCE'; end if;
  if jsonb_typeof(p_reels) <> 'array' or jsonb_array_length(p_reels) <> 3 then
    raise exception 'INVALID_REELS';
  end if;
  if p_server_seed_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_SERVER_SEED_HASH'; end if;
  if nullif(trim(p_server_seed), '') is null then raise exception 'SERVER_SEED_REQUIRED'; end if;
  if nullif(trim(p_client_seed), '') is null then raise exception 'CLIENT_SEED_REQUIRED'; end if;

  v_expected_payout := round(p_bet_amount * p_multiplier, 2);
  if abs(v_expected_payout - round(p_payout_amount, 2)) > 0.01 then
    raise exception 'PAYOUT_MULTIPLIER_MISMATCH';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('taco_slot:' || p_round_ref, 0));

  select *
    into v_existing
  from public.slot_spins
  where round_ref = p_round_ref
  limit 1;

  if found then
    if v_existing.user_id <> p_user_id then raise exception 'ROUND_REF_CONFLICT'; end if;

    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'spin_id', v_existing.id,
      'round_ref', v_existing.round_ref,
      'bet_amount', v_existing.bet_amount,
      'payout_amount', v_existing.payout_amount,
      'multiplier', v_existing.multiplier,
      'reels', v_existing.reels,
      'server_seed_hash', v_existing.server_seed_hash,
      'server_seed', v_existing.server_seed,
      'client_seed', v_existing.client_seed,
      'nonce', v_existing.nonce,
      'metadata', v_existing.metadata
    );
  end if;

  perform private.assert_chido_game_write_allowed(p_user_id);

  insert into public.balances(
    user_id, balance, bonus_balance, locked_balance, commission_balance, currency
  ) values (
    p_user_id, 0, 0, 0, 0, 'MXN'
  ) on conflict(user_id) do nothing;

  select balance, bonus_balance
    into v_balance, v_bonus
  from public.balances
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) >= p_bet_amount then
    v_source := 'balance';
    v_bet := public.wallet_apply_delta(
      p_user_id,
      -p_bet_amount,
      0,
      0,
      'taco_slot_bet_balance',
      p_round_ref || ':bet',
      'internal_game',
      jsonb_build_object('game', 'taco_slot', 'source', 'balance')
    );
  elsif coalesce(v_bonus, 0) >= p_bet_amount then
    v_source := 'bonus';
    v_bet := public.wallet_apply_delta(
      p_user_id,
      0,
      -p_bet_amount,
      0,
      'taco_slot_bet_bonus',
      p_round_ref || ':bet',
      'internal_game',
      jsonb_build_object('game', 'taco_slot', 'source', 'bonus')
    );
  else
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  if coalesce(v_bet ->> 'ok', 'false') <> 'true' then
    raise exception 'BET_WALLET_FAILED';
  end if;

  if p_payout_amount > 0 then
    v_payout := public.wallet_apply_delta(
      p_user_id,
      p_payout_amount,
      0,
      0,
      'taco_slot_win',
      p_round_ref || ':payout',
      'internal_game',
      jsonb_build_object('game', 'taco_slot', 'multiplier', p_multiplier)
    );

    if coalesce(v_payout ->> 'ok', 'false') <> 'true' then
      raise exception 'PAYOUT_WALLET_FAILED';
    end if;
  end if;

  insert into public.slot_spins(
    user_id,
    bet_amount,
    payout_amount,
    multiplier,
    reels,
    server_seed_hash,
    server_seed,
    client_seed,
    nonce,
    metadata,
    round_ref
  ) values (
    p_user_id,
    round(p_bet_amount, 2),
    round(p_payout_amount, 2),
    p_multiplier,
    p_reels,
    p_server_seed_hash,
    p_server_seed,
    p_client_seed,
    p_nonce,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('wallet_source', v_source),
    p_round_ref
  ) returning id into v_spin_id;

  v_effects := public.record_wager_effects(
    p_user_id,
    p_bet_amount,
    'slot:' || p_round_ref,
    'taco_slot',
    0.005
  );

  if coalesce(v_effects ->> 'ok', 'false') <> 'true' then
    raise exception 'WAGER_EFFECTS_FAILED';
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'spin_id', v_spin_id,
    'round_ref', p_round_ref,
    'bet_amount', round(p_bet_amount, 2),
    'payout_amount', round(p_payout_amount, 2),
    'multiplier', p_multiplier,
    'reels', p_reels,
    'server_seed_hash', p_server_seed_hash,
    'server_seed', p_server_seed,
    'client_seed', p_client_seed,
    'nonce', p_nonce,
    'metadata', coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('wallet_source', v_source),
    'source', v_source,
    'bet_wallet', v_bet,
    'payout_wallet', v_payout,
    'effects', v_effects
  );
end;
$$;

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
set search_path = public, pg_temp
as $$
declare
  v_existing public.crash_bets%rowtype;
  v_balance numeric;
  v_bonus numeric;
  v_source text;
  v_bet jsonb;
  v_settle jsonb;
  v_effects jsonb;
  v_bet_id uuid;
  v_expected_payout numeric;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if nullif(trim(p_round_ref), '') is null then raise exception 'ROUND_REF_REQUIRED'; end if;
  if coalesce(p_bet_amount, 0) <= 0 then raise exception 'INVALID_BET'; end if;
  if coalesce(p_target_multiplier, 0) < 1.01 then raise exception 'INVALID_TARGET_MULTIPLIER'; end if;
  if coalesce(p_crash_multiplier, 0) < 1 then raise exception 'INVALID_CRASH_MULTIPLIER'; end if;
  if coalesce(p_payout_amount, 0) < 0 then raise exception 'INVALID_PAYOUT'; end if;
  if p_server_seed_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_SERVER_SEED_HASH'; end if;
  if nullif(trim(p_server_seed), '') is null then raise exception 'SERVER_SEED_REQUIRED'; end if;

  if coalesce(p_did_cashout, false) then
    if p_target_multiplier > p_crash_multiplier then raise exception 'INVALID_CASHOUT_RESULT'; end if;
    v_expected_payout := round(p_bet_amount * p_target_multiplier, 2);
    if abs(v_expected_payout - round(p_payout_amount, 2)) > 0.01 then
      raise exception 'PAYOUT_MULTIPLIER_MISMATCH';
    end if;
  else
    if p_target_multiplier <= p_crash_multiplier then raise exception 'INVALID_BUST_RESULT'; end if;
    if round(p_payout_amount, 2) <> 0 then raise exception 'INVALID_BUST_PAYOUT'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('crash:' || p_round_ref, 0));

  select *
    into v_existing
  from public.crash_bets
  where ref_id = p_round_ref
  limit 1;

  if found then
    if v_existing.user_id <> p_user_id then raise exception 'ROUND_REF_CONFLICT'; end if;

    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'bet_id', v_existing.id,
      'round_ref', v_existing.ref_id,
      'bet_amount', v_existing.bet_amount,
      'target_multiplier', v_existing.target_multiplier,
      'crash_multiplier', v_existing.crash_multiplier,
      'did_cashout', v_existing.did_cashout,
      'payout_amount', v_existing.payout,
      'server_seed_hash', v_existing.server_seed_hash,
      'server_seed', v_existing.server_seed,
      'metadata', v_existing.metadata
    );
  end if;

  perform private.assert_chido_game_write_allowed(p_user_id);

  insert into public.balances(
    user_id, balance, bonus_balance, locked_balance, commission_balance, currency
  ) values (
    p_user_id, 0, 0, 0, 0, 'MXN'
  ) on conflict(user_id) do nothing;

  select balance, bonus_balance
    into v_balance, v_bonus
  from public.balances
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) >= p_bet_amount then
    v_source := 'balance';
    v_bet := public.wallet_apply_delta(
      p_user_id,
      -p_bet_amount,
      0,
      p_bet_amount,
      'crash_bet_balance',
      p_round_ref || ':bet',
      'internal_game',
      jsonb_build_object('game', 'crash', 'source', 'balance')
    );
  elsif coalesce(v_bonus, 0) >= p_bet_amount then
    v_source := 'bonus';
    v_bet := public.wallet_apply_delta(
      p_user_id,
      0,
      -p_bet_amount,
      p_bet_amount,
      'crash_bet_bonus',
      p_round_ref || ':bet',
      'internal_game',
      jsonb_build_object('game', 'crash', 'source', 'bonus')
    );
  else
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  if coalesce(v_bet ->> 'ok', 'false') <> 'true' then
    raise exception 'BET_WALLET_FAILED';
  end if;

  insert into public.crash_bets(
    user_id,
    bet_amount,
    target_multiplier,
    crash_multiplier,
    did_cashout,
    payout,
    ref_id,
    server_seed_hash,
    server_seed,
    metadata
  ) values (
    p_user_id,
    round(p_bet_amount, 2),
    p_target_multiplier,
    p_crash_multiplier,
    p_did_cashout,
    round(p_payout_amount, 2),
    p_round_ref,
    p_server_seed_hash,
    p_server_seed,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('wallet_source', v_source)
  ) returning id into v_bet_id;

  v_settle := public.wallet_apply_delta(
    p_user_id,
    p_payout_amount,
    0,
    -p_bet_amount,
    case when p_did_cashout then 'crash_cashout' else 'crash_bust' end,
    p_round_ref || ':settle',
    'internal_game',
    jsonb_build_object(
      'game', 'crash',
      'did_cashout', p_did_cashout,
      'target_multiplier', p_target_multiplier
    )
  );

  if coalesce(v_settle ->> 'ok', 'false') <> 'true' then
    raise exception 'SETTLE_WALLET_FAILED';
  end if;

  v_effects := public.record_wager_effects(
    p_user_id,
    p_bet_amount,
    'crash:' || p_round_ref,
    'crash',
    0.005
  );

  if coalesce(v_effects ->> 'ok', 'false') <> 'true' then
    raise exception 'WAGER_EFFECTS_FAILED';
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'bet_id', v_bet_id,
    'round_ref', p_round_ref,
    'bet_amount', round(p_bet_amount, 2),
    'target_multiplier', p_target_multiplier,
    'crash_multiplier', p_crash_multiplier,
    'did_cashout', p_did_cashout,
    'payout_amount', round(p_payout_amount, 2),
    'server_seed_hash', p_server_seed_hash,
    'server_seed', p_server_seed,
    'metadata', coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('wallet_source', v_source),
    'source', v_source,
    'bet_wallet', v_bet,
    'settle_wallet', v_settle,
    'effects', v_effects
  );
end;
$$;

revoke all on function public.casino_settle_taco_slot(
  uuid, text, numeric, numeric, numeric, jsonb, text, text, text, bigint, jsonb
) from public, anon, authenticated;
grant execute on function public.casino_settle_taco_slot(
  uuid, text, numeric, numeric, numeric, jsonb, text, text, text, bigint, jsonb
) to service_role;

revoke all on function public.casino_settle_crash(
  uuid, text, numeric, numeric, numeric, boolean, numeric, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.casino_settle_crash(
  uuid, text, numeric, numeric, numeric, boolean, numeric, text, text, jsonb
) to service_role;

commit;

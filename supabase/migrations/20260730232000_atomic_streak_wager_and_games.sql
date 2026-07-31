-- Atomic daily streak, wager effects, affiliate commission and game settlement.

create or replace function public.claim_daily_streak(
  p_user_id uuid,
  p_claimed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim_date date := timezone('utc', p_claimed_at)::date;
  v_existing public.daily_streak_claims%rowtype;
  v_last public.daily_streak_claims%rowtype;
  v_profile public.profiles%rowtype;
  v_streak integer := 1;
  v_reward numeric := 0;
  v_free_rounds integer := 0;
  v_reward_kind text := 'bonus';
  v_wager_required numeric := 0;
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
      'free_rounds', v_existing.free_rounds_awarded,
      'reward_kind', v_existing.reward_kind,
      'streak', v_existing.streak_count,
      'wagering_required', v_existing.wagering_required,
      'wagering_progress', v_existing.wagering_progress,
      'claimed_at', v_existing.claimed_at
    );
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  if coalesce(v_profile.wager_required, 0) > coalesce(v_profile.wager_progress, 0) then
    return jsonb_build_object(
      'ok', false,
      'error', 'STREAK_WAGERING_ACTIVE',
      'required', v_profile.wager_required,
      'progress', v_profile.wager_progress
    );
  end if;

  if exists(
    select 1 from public.promo_claims
    where user_id = p_user_id and status in ('active', 'applied')
  ) then
    return jsonb_build_object('ok', false, 'error', 'PROMO_ACTIVE');
  end if;

  select * into v_last
  from public.daily_streak_claims
  where user_id = p_user_id and claim_date < v_claim_date
  order by claim_date desc
  limit 1
  for update;

  if found and v_last.claim_date = v_claim_date - 1 then
    v_streak := (v_last.streak_count % 7) + 1;
  else
    v_streak := 1;
  end if;

  case v_streak
    when 1 then v_reward := 5;
    when 2 then v_reward := 10;
    when 3 then v_reward := 15;
    when 4 then v_reward := 25;
    when 5 then v_reward := 50;
    when 6 then v_reward := 100;
    when 7 then
      v_reward := 0;
      v_free_rounds := 10;
      v_reward_kind := 'free_rounds';
    else raise exception 'INVALID_STREAK_DAY';
  end case;

  v_wager_required := round(v_reward * 10, 2);
  v_ref := 'daily_streak:' || p_user_id::text || ':' || v_claim_date::text;

  if v_reward > 0 then
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
        'claim_date', v_claim_date,
        'wagering_multiplier', 10,
        'wagering_required', v_wager_required
      )
    );
    if coalesce(v_wallet->>'ok', 'false') <> 'true' then
      raise exception 'STREAK_WALLET_APPLY_FAILED';
    end if;

    update public.profiles
    set wager_required = v_wager_required,
        wager_progress = 0,
        updated_at = now()
    where id = p_user_id;
  end if;

  if v_free_rounds > 0 then
    insert into public.free_round_entitlements(
      user_id, game, remaining, source, expires_at, metadata, ref_id
    )
    values (
      p_user_id,
      'crash',
      v_free_rounds,
      'daily_streak',
      p_claimed_at + interval '7 days',
      jsonb_build_object('day', v_streak, 'claim_date', v_claim_date),
      v_ref || ':free_rounds'
    )
    on conflict (ref_id) where ref_id is not null do nothing;
  end if;

  insert into public.daily_streak_claims(
    user_id, claim_date, streak_count, reward_amount, claimed_at, wallet_ref_id,
    free_rounds_awarded, wagering_required, wagering_progress, reward_kind
  )
  values (
    p_user_id, v_claim_date, v_streak, v_reward, p_claimed_at, v_ref,
    v_free_rounds, v_wager_required, 0, v_reward_kind
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', coalesce((v_wallet->>'idempotent')::boolean, false),
    'already_claimed', false,
    'awarded', v_reward,
    'free_rounds', v_free_rounds,
    'reward_kind', v_reward_kind,
    'streak', v_streak,
    'wagering_required', v_wager_required,
    'wagering_progress', 0,
    'claimed_at', p_claimed_at,
    'wallet', v_wallet
  );
end;
$$;

create or replace function public.get_daily_streak_status(
  p_user_id uuid,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_date date := timezone('utc', p_at)::date;
  v_today public.daily_streak_claims%rowtype;
  v_last public.daily_streak_claims%rowtype;
  v_profile public.profiles%rowtype;
  v_next integer := 1;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;

  select * into v_today
  from public.daily_streak_claims
  where user_id = p_user_id and claim_date = v_date
  limit 1;

  select * into v_last
  from public.daily_streak_claims
  where user_id = p_user_id and claim_date <= v_date
  order by claim_date desc
  limit 1;

  select * into v_profile from public.profiles where id = p_user_id;

  if found and v_last.claim_date = v_date - 1 then
    v_next := (v_last.streak_count % 7) + 1;
  elsif found and v_last.claim_date = v_date then
    v_next := v_last.streak_count;
  else
    v_next := 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'claimed_today', (v_today.id is not null),
    'current_streak', coalesce(v_last.streak_count, 0),
    'next_day', v_next,
    'last_claim_date', v_last.claim_date,
    'wagering_required', coalesce(v_profile.wager_required, 0),
    'wagering_progress', coalesce(v_profile.wager_progress, 0),
    'can_claim', (
      v_today.id is null
      and coalesce(v_profile.wager_required, 0) <= coalesce(v_profile.wager_progress, 0)
      and not exists(
        select 1 from public.promo_claims
        where user_id = p_user_id and status in ('active', 'applied')
      )
    )
  );
end;
$$;

create or replace function public.credit_affiliate_wager_commission_atomic(
  p_referred_user_id uuid,
  p_wager_amount numeric,
  p_wager_ref text,
  p_game text,
  p_rate numeric default 0.005
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referral public.affiliate_referrals%rowtype;
  v_affiliate_user_id uuid;
  v_amount numeric;
  v_ref text;
  v_tx_id uuid;
  v_balance numeric;
begin
  if p_referred_user_id is null
     or coalesce(p_wager_amount, 0) <= 0
     or nullif(trim(p_wager_ref), '') is null then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'INVALID_OR_EMPTY_INPUT');
  end if;

  v_amount := round(p_wager_amount * greatest(0, least(coalesce(p_rate, 0.005), 1)), 2);
  if v_amount <= 0 then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'BELOW_MINIMUM');
  end if;

  v_ref := 'aff_wager:' || trim(p_wager_ref);
  perform pg_advisory_xact_lock(hashtextextended(v_ref, 0));
  if exists(select 1 from public.affiliate_commissions where ref_id = v_ref) then
    return jsonb_build_object('ok', true, 'credited', true, 'idempotent', true, 'ref_id', v_ref);
  end if;

  select r.* into v_referral
  from public.affiliate_referrals r
  where r.referred_user_id = p_referred_user_id
  order by r.created_at asc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'NO_REFERRAL');
  end if;

  v_affiliate_user_id := coalesce(v_referral.affiliate_user_id, v_referral.referrer_id);
  if v_affiliate_user_id is null
     or not exists(
       select 1 from public.affiliates a
       where a.user_id = v_affiliate_user_id and a.status = 'active'
     ) then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'AFFILIATE_INACTIVE');
  end if;

  insert into public.balances(
    user_id, balance, bonus_balance, locked_balance, commission_balance, currency
  )
  values (v_affiliate_user_id, 0, 0, 0, 0, 'MXN')
  on conflict (user_id) do nothing;

  select commission_balance into v_balance
  from public.balances
  where user_id = v_affiliate_user_id
  for update;

  insert into public.affiliate_commissions(
    affiliate_user_id, referred_user_id, amount, reason, ref_id, status, metadata
  )
  values (
    v_affiliate_user_id,
    p_referred_user_id,
    v_amount,
    'wager_commission',
    v_ref,
    'pending',
    jsonb_build_object(
      'wager_amount', p_wager_amount,
      'wager_ref', p_wager_ref,
      'game', p_game,
      'rate', p_rate
    )
  );

  update public.balances
  set commission_balance = round(coalesce(commission_balance, 0) + v_amount, 2),
      updated_at = now()
  where user_id = v_affiliate_user_id;

  v_tx_id := gen_random_uuid();
  insert into public.transactions(
    id, user_id, amount, type, status, method, reason, ref_id, metadata, created_at, updated_at
  )
  values (
    v_tx_id,
    v_affiliate_user_id,
    v_amount,
    'bonus'::transaction_type,
    'completed'::transaction_status,
    'internal_game'::transaction_method,
    'affiliate_wager_commission',
    v_ref,
    jsonb_build_object(
      'referred_user_id', p_referred_user_id,
      'wager_amount', p_wager_amount,
      'wager_ref', p_wager_ref,
      'game', p_game,
      'commission_balance', round(coalesce(v_balance, 0) + v_amount, 2)
    ),
    now(),
    now()
  );

  update public.affiliate_commissions
  set status = 'credited',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'credited_at', now(),
        'tx_id', v_tx_id
      )
  where ref_id = v_ref;

  update public.affiliate_referrals
  set total_commission = round(coalesce(total_commission, 0) + v_amount, 2),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_wager_commission_at', now(),
        'last_wager_ref', p_wager_ref
      )
  where id = v_referral.id;

  return jsonb_build_object(
    'ok', true,
    'credited', true,
    'idempotent', false,
    'amount', v_amount,
    'affiliate_user_id', v_affiliate_user_id,
    'tx_id', v_tx_id,
    'ref_id', v_ref
  );
end;
$$;

create or replace function public.record_wager_effects(
  p_user_id uuid,
  p_wager_amount numeric,
  p_wager_ref text,
  p_game text default null,
  p_affiliate_rate numeric default 0.005
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.wager_progress_ledger%rowtype;
  v_claim public.promo_claims%rowtype;
  v_streak public.daily_streak_claims%rowtype;
  v_profile public.profiles%rowtype;
  v_required numeric := 0;
  v_progress numeric := 0;
  v_next numeric := 0;
  v_bonus numeric := 0;
  v_release jsonb;
  v_affiliate jsonb;
  v_rollover jsonb := jsonb_build_object('status', 'none');
  v_result jsonb;
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if coalesce(p_wager_amount, 0) <= 0 then raise exception 'INVALID_WAGER_AMOUNT'; end if;
  if nullif(trim(p_wager_ref), '') is null then raise exception 'WAGER_REF_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('wager_effects:' || trim(p_wager_ref), 0));
  select * into v_existing
  from public.wager_progress_ledger
  where wager_ref = trim(p_wager_ref);

  if found then
    return coalesce(v_existing.result, '{}'::jsonb) || jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  v_affiliate := public.credit_affiliate_wager_commission_atomic(
    p_user_id, p_wager_amount, p_wager_ref, p_game, p_affiliate_rate
  );
  if coalesce(v_affiliate->>'ok', 'false') <> 'true' then
    raise exception 'AFFILIATE_WAGER_EFFECT_FAILED';
  end if;

  select * into v_claim
  from public.promo_claims
  where user_id = p_user_id and status = 'applied'
  order by claimed_at desc
  limit 1
  for update;

  if found and coalesce(v_claim.wagering_required, 0) > 0 then
    v_required := v_claim.wagering_required;
    v_progress := coalesce(v_claim.wagering_progress, 0);
    v_next := least(v_required, v_progress + p_wager_amount);

    if v_next >= v_required then
      select coalesce(bonus_balance, 0) into v_bonus
      from public.balances
      where user_id = p_user_id
      for update;

      if v_bonus > 0 then
        v_release := public.wallet_apply_delta(
          p_user_id => p_user_id,
          p_delta_balance => v_bonus,
          p_delta_bonus => -v_bonus,
          p_delta_locked => 0,
          p_reason => 'promo_bonus_release',
          p_ref_id => 'promo_clear:' || v_claim.id::text,
          p_method => 'internal_game',
          p_metadata => jsonb_build_object(
            'claim_id', v_claim.id,
            'completed_by_wager_ref', p_wager_ref
          )
        );
        if coalesce(v_release->>'ok', 'false') <> 'true' then
          raise exception 'PROMO_RELEASE_FAILED';
        end if;
      end if;

      update public.promo_claims
      set wagering_progress = v_required,
          status = 'completed',
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'completed_at', now(),
            'completed_by', 'atomic_wager',
            'last_wager_ref', p_wager_ref,
            'last_game', p_game
          )
      where id = v_claim.id;

      v_rollover := jsonb_build_object(
        'status', 'completed',
        'source', 'promo',
        'claim_id', v_claim.id,
        'required', v_required,
        'progress', v_required,
        'released', v_bonus
      );
    else
      update public.promo_claims
      set wagering_progress = v_next,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'last_wager_ref', p_wager_ref,
            'last_game', p_game,
            'last_wager_amount', p_wager_amount,
            'last_wager_at', now()
          )
      where id = v_claim.id;

      v_rollover := jsonb_build_object(
        'status', 'progressed',
        'source', 'promo',
        'claim_id', v_claim.id,
        'required', v_required,
        'progress', v_next
      );
    end if;
  else
    select * into v_profile from public.profiles where id = p_user_id for update;
    if found and coalesce(v_profile.wager_required, 0) > coalesce(v_profile.wager_progress, 0) then
      select * into v_streak
      from public.daily_streak_claims
      where user_id = p_user_id and wagering_required > wagering_progress
      order by claim_date desc
      limit 1
      for update;

      if found then
        v_required := v_profile.wager_required;
        v_progress := coalesce(v_profile.wager_progress, 0);
        v_next := least(v_required, v_progress + p_wager_amount);

        if v_next >= v_required then
          select coalesce(bonus_balance, 0) into v_bonus
          from public.balances
          where user_id = p_user_id
          for update;

          if v_bonus > 0 then
            v_release := public.wallet_apply_delta(
              p_user_id => p_user_id,
              p_delta_balance => v_bonus,
              p_delta_bonus => -v_bonus,
              p_delta_locked => 0,
              p_reason => 'daily_streak_bonus_release',
              p_ref_id => 'streak_clear:' || v_streak.id::text,
              p_method => 'internal_game',
              p_metadata => jsonb_build_object(
                'daily_streak_claim_id', v_streak.id,
                'completed_by_wager_ref', p_wager_ref
              )
            );
            if coalesce(v_release->>'ok', 'false') <> 'true' then
              raise exception 'STREAK_RELEASE_FAILED';
            end if;
          end if;

          update public.profiles
          set wager_required = 0,
              wager_progress = 0,
              updated_at = now()
          where id = p_user_id;

          update public.daily_streak_claims
          set wagering_progress = v_required
          where id = v_streak.id;

          v_rollover := jsonb_build_object(
            'status', 'completed',
            'source', 'daily_streak',
            'claim_id', v_streak.id,
            'required', v_required,
            'progress', v_required,
            'released', v_bonus
          );
        else
          update public.profiles
          set wager_progress = v_next,
              updated_at = now()
          where id = p_user_id;

          update public.daily_streak_claims
          set wagering_progress = v_next
          where id = v_streak.id;

          v_rollover := jsonb_build_object(
            'status', 'progressed',
            'source', 'daily_streak',
            'claim_id', v_streak.id,
            'required', v_required,
            'progress', v_next
          );
        end if;
      end if;
    end if;
  end if;

  v_result := jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'wager_ref', trim(p_wager_ref),
    'wager_amount', p_wager_amount,
    'game', p_game,
    'affiliate', v_affiliate,
    'rollover', v_rollover
  );

  insert into public.wager_progress_ledger(user_id, wager_ref, wager_amount, game, result)
  values (p_user_id, trim(p_wager_ref), p_wager_amount, p_game, v_result);

  return v_result;
end;
$$;

create or replace function public.apply_wager_progress(p_user_id uuid, p_wager_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.record_wager_effects(
    p_user_id,
    p_wager_amount,
    'legacy:' || p_user_id::text || ':' || gen_random_uuid()::text,
    'legacy',
    0.005
  );
end;
$$;

create or replace function public._distribute_affiliate_commission(
  p_affiliate_user_id uuid,
  p_referred_user_id uuid,
  p_wager_amount numeric,
  p_commission_amount numeric,
  p_wager_ref text,
  p_game text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate numeric;
  v_result jsonb;
begin
  if coalesce(p_wager_amount, 0) <= 0 then return; end if;
  v_rate := greatest(0, coalesce(p_commission_amount, 0) / p_wager_amount);
  v_result := public.credit_affiliate_wager_commission_atomic(
    p_referred_user_id, p_wager_amount, p_wager_ref, p_game, v_rate
  );
  if coalesce(v_result->>'ok', 'false') <> 'true' then
    raise exception 'AFFILIATE_COMMISSION_FAILED';
  end if;
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
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if nullif(trim(p_round_ref), '') is null then raise exception 'ROUND_REF_REQUIRED'; end if;
  if coalesce(p_bet_amount, 0) <= 0 then raise exception 'INVALID_BET'; end if;
  if coalesce(p_payout_amount, 0) < 0 then raise exception 'INVALID_PAYOUT'; end if;
  if not coalesce(p_did_cashout, false) and coalesce(p_payout_amount, 0) <> 0 then
    raise exception 'INVALID_BUST_PAYOUT';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('crash:' || p_round_ref, 0));
  select * into v_existing from public.crash_bets where ref_id = p_round_ref limit 1;
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

  insert into public.balances(user_id, balance, bonus_balance, locked_balance, commission_balance, currency)
  values (p_user_id, 0, 0, 0, 0, 'MXN')
  on conflict (user_id) do nothing;

  select balance, bonus_balance into v_balance, v_bonus
  from public.balances
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) >= p_bet_amount then
    v_source := 'balance';
    v_bet := public.wallet_apply_delta(
      p_user_id, -p_bet_amount, 0, p_bet_amount,
      'crash_bet_balance', p_round_ref || ':bet', 'internal_game',
      jsonb_build_object('game', 'crash', 'source', 'balance')
    );
  elsif coalesce(v_bonus, 0) >= p_bet_amount then
    v_source := 'bonus';
    v_bet := public.wallet_apply_delta(
      p_user_id, 0, -p_bet_amount, p_bet_amount,
      'crash_bet_bonus', p_round_ref || ':bet', 'internal_game',
      jsonb_build_object('game', 'crash', 'source', 'bonus')
    );
  else
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  if coalesce(v_bet->>'ok', 'false') <> 'true' then raise exception 'BET_WALLET_FAILED'; end if;

  insert into public.crash_bets(
    user_id, bet_amount, target_multiplier, crash_multiplier, did_cashout,
    payout, ref_id, server_seed_hash, server_seed, metadata
  )
  values (
    p_user_id, round(p_bet_amount, 2), p_target_multiplier, p_crash_multiplier,
    p_did_cashout, round(p_payout_amount, 2), p_round_ref, p_server_seed_hash,
    p_server_seed, coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('wallet_source', v_source)
  )
  returning id into v_bet_id;

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
  if coalesce(v_settle->>'ok', 'false') <> 'true' then raise exception 'SETTLE_WALLET_FAILED'; end if;

  v_effects := public.record_wager_effects(
    p_user_id, p_bet_amount, 'crash:' || p_round_ref, 'crash', 0.005
  );
  if coalesce(v_effects->>'ok', 'false') <> 'true' then raise exception 'WAGER_EFFECTS_FAILED'; end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'bet_id', v_bet_id,
    'source', v_source,
    'bet_wallet', v_bet,
    'settle_wallet', v_settle,
    'effects', v_effects
  );
end;
$$;

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
begin
  if p_user_id is null then raise exception 'USER_REQUIRED'; end if;
  if nullif(trim(p_round_ref), '') is null then raise exception 'ROUND_REF_REQUIRED'; end if;
  if coalesce(p_bet_amount, 0) <= 0 then raise exception 'INVALID_BET'; end if;
  if coalesce(p_payout_amount, 0) < 0 then raise exception 'INVALID_PAYOUT'; end if;
  if coalesce(p_nonce, 0) <= 0 then raise exception 'INVALID_NONCE'; end if;

  perform pg_advisory_xact_lock(hashtextextended('taco_slot:' || p_round_ref, 0));
  select * into v_existing from public.slot_spins where round_ref = p_round_ref limit 1;
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

  insert into public.balances(user_id, balance, bonus_balance, locked_balance, commission_balance, currency)
  values (p_user_id, 0, 0, 0, 0, 'MXN')
  on conflict (user_id) do nothing;

  select balance, bonus_balance into v_balance, v_bonus
  from public.balances
  where user_id = p_user_id
  for update;

  if coalesce(v_balance, 0) >= p_bet_amount then
    v_source := 'balance';
    v_bet := public.wallet_apply_delta(
      p_user_id, -p_bet_amount, 0, 0,
      'taco_slot_bet_balance', p_round_ref || ':bet', 'internal_game',
      jsonb_build_object('game', 'taco_slot', 'source', 'balance')
    );
  elsif coalesce(v_bonus, 0) >= p_bet_amount then
    v_source := 'bonus';
    v_bet := public.wallet_apply_delta(
      p_user_id, 0, -p_bet_amount, 0,
      'taco_slot_bet_bonus', p_round_ref || ':bet', 'internal_game',
      jsonb_build_object('game', 'taco_slot', 'source', 'bonus')
    );
  else
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  if coalesce(v_bet->>'ok', 'false') <> 'true' then raise exception 'BET_WALLET_FAILED'; end if;

  if p_payout_amount > 0 then
    v_payout := public.wallet_apply_delta(
      p_user_id, p_payout_amount, 0, 0,
      'taco_slot_win', p_round_ref || ':payout', 'internal_game',
      jsonb_build_object('game', 'taco_slot', 'multiplier', p_multiplier)
    );
    if coalesce(v_payout->>'ok', 'false') <> 'true' then raise exception 'PAYOUT_WALLET_FAILED'; end if;
  end if;

  insert into public.slot_spins(
    user_id, bet_amount, payout_amount, multiplier, reels, server_seed_hash,
    server_seed, client_seed, nonce, metadata, round_ref
  )
  values (
    p_user_id, round(p_bet_amount, 2), round(p_payout_amount, 2), p_multiplier,
    p_reels, p_server_seed_hash, p_server_seed, p_client_seed, p_nonce,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('wallet_source', v_source),
    p_round_ref
  )
  returning id into v_spin_id;

  v_effects := public.record_wager_effects(
    p_user_id, p_bet_amount, 'slot:' || p_round_ref, 'taco_slot', 0.005
  );
  if coalesce(v_effects->>'ok', 'false') <> 'true' then raise exception 'WAGER_EFFECTS_FAILED'; end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'spin_id', v_spin_id,
    'nonce', p_nonce,
    'source', v_source,
    'bet_wallet', v_bet,
    'payout_wallet', v_payout,
    'effects', v_effects
  );
end;
$$;
